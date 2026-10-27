import { Injectable, Logger, type OnModuleDestroy } from '@nestjs/common';
import { type JobsOptions, Queue, Worker } from 'bullmq';
import { AppConfigService } from '../../config/app-config.service.js';

export type JobHandler = (data: Record<string, unknown>) => Promise<void>;

export const JOB_QUEUE_NAME = 'mindbridge-jobs';

/**
 * Small facade over BullMQ. Feature modules register named handlers; the API process
 * enqueues and the worker process (src/worker.ts) consumes. With QUEUES_ENABLED=false
 * (tests, single-process dev) immediate jobs run inline and delayed jobs are skipped with a warning.
 */
@Injectable()
export class JobsService implements OnModuleDestroy {
  private readonly logger = new Logger(JobsService.name);
  private readonly handlers = new Map<string, JobHandler>();
  private queue?: Queue;
  private worker?: Worker;

  constructor(private readonly config: AppConfigService) {
    if (this.enabled) {
      this.queue = new Queue(JOB_QUEUE_NAME, { connection: this.connection() });
    }
  }

  get enabled(): boolean {
    return this.config.get('QUEUES_ENABLED');
  }

  private connection() {
    const url = new URL(this.config.get('REDIS_URL'));
    return {
      host: url.hostname,
      port: Number(url.port || 6379),
      username: url.username || undefined,
      password: url.password || undefined,
      db: url.pathname.length > 1 ? Number(url.pathname.slice(1)) : 0,
      maxRetriesPerRequest: null,
    };
  }

  register(name: string, handler: JobHandler): void {
    this.handlers.set(name, handler);
  }

  async dispatch(name: string, data: Record<string, unknown>, opts: JobsOptions = {}): Promise<void> {
    if (this.queue) {
      await this.queue.add(name, data, {
        attempts: 5,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 1000,
        removeOnFail: 5000,
        ...opts,
      });
      return;
    }
    if (opts.delay && opts.delay > 0) {
      this.logger.warn({ msg: 'delayed job skipped because queues are disabled', job: name });
      return;
    }
    await this.runHandler(name, data);
  }

  async cancel(jobId: string): Promise<void> {
    if (!this.queue) return;
    const job = await this.queue.getJob(jobId);
    await job?.remove().catch(() => undefined);
  }

  /** Called only by the worker entrypoint. */
  startWorker(): void {
    if (!this.enabled || this.worker) return;
    this.worker = new Worker(JOB_QUEUE_NAME, async (job) => this.runHandler(job.name, job.data), {
      connection: this.connection(),
      concurrency: 5,
    });
    this.worker.on('failed', (job, err) =>
      this.logger.error({ msg: 'job failed', job: job?.name, attempts: job?.attemptsMade, error: err.message }),
    );
    this.logger.log('Job worker started');
  }

  async queueHealth(): Promise<{ enabled: boolean; waiting?: number; failed?: number; delayed?: number }> {
    if (!this.queue) return { enabled: false };
    const counts = await this.queue.getJobCounts('waiting', 'failed', 'delayed');
    return { enabled: true, waiting: counts['waiting'], failed: counts['failed'], delayed: counts['delayed'] };
  }

  private async runHandler(name: string, data: Record<string, unknown>) {
    const handler = this.handlers.get(name);
    if (!handler) {
      this.logger.error({ msg: 'no handler registered', job: name });
      return;
    }
    await handler(data);
  }

  async onModuleDestroy() {
    await this.worker?.close();
    await this.queue?.close();
  }
}
