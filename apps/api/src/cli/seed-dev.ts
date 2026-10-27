/**
 * Synthetic development data. Refuses to run in production. Every person here is fictional,
 * every email uses the reserved .test domain, and registration numbers are marked DEMO.
 * A random password is generated per run and printed once (never stored in the repository).
 *
 * Usage (from apps/api, after `npm run build`): node dist/cli/seed-dev.js --yes
 */
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { getModelToken } from '@nestjs/mongoose';
import {
  AccountStatus,
  ConsentType,
  ConsultationMode,
  ContentStatus,
  DoctorVerificationStatus,
  ProfessionalCategory,
  Role,
  WellnessContentType,
} from '@mindbridge/shared-types';
import type { Model } from 'mongoose';
import { randomBytes } from 'node:crypto';
import { parseArgs } from 'node:util';
import { AppModule } from '../app.module.js';
import { PasswordService } from '../modules/auth/password.service.js';
import { ConsentService } from '../modules/consent/consent.service.js';
import { CrisisResourcesService } from '../modules/crisis-resources/crisis-resources.service.js';
import { DoctorProfile } from '../modules/doctors/schemas/doctor-profile.schema.js';
import { PatientProfile } from '../modules/patients/schemas/patient-profile.schema.js';
import { User } from '../modules/users/schemas/user.schema.js';
import { ProfessionalVerification } from '../modules/verification/schemas/professional-verification.schema.js';
import { WellnessContent } from '../modules/wellness/schemas/wellness-content.schema.js';
import { WellnessService } from '../modules/wellness/wellness.service.js';

const WEEKDAYS = [1, 2, 3, 4, 5].map((d) => ({ dayOfWeek: d, start: '10:00', end: '17:00' }));

const DOCTORS = [
  { name: 'Dr. Meera Iyer (demo)', email: 'meera.demo@mindbridge.test', category: ProfessionalCategory.CLINICAL_PSYCHOLOGIST, specialties: ['anxiety', 'stress', 'sleep'], languages: ['en', 'hi', 'ta'], years: 9, fee: 1200, status: DoctorVerificationStatus.APPROVED },
  { name: 'Dr. Arjun Sen (demo)', email: 'arjun.demo@mindbridge.test', category: ProfessionalCategory.PSYCHIATRIST, specialties: ['mood', 'adhd'], languages: ['en', 'bn', 'hi'], years: 14, fee: 1800, status: DoctorVerificationStatus.APPROVED },
  { name: 'Ritu Kapoor (demo)', email: 'ritu.demo@mindbridge.test', category: ProfessionalCategory.COUNSELLOR, specialties: ['relationships', 'grief', 'students'], languages: ['en', 'hi', 'pa'], years: 6, fee: 800, status: DoctorVerificationStatus.APPROVED },
  { name: 'Kabir Rao (demo, pending)', email: 'kabir.demo@mindbridge.test', category: ProfessionalCategory.COUNSELLOR, specialties: ['work stress'], languages: ['en', 'te'], years: 3, fee: 700, status: DoctorVerificationStatus.PENDING_VERIFICATION },
];

const CONTENT = [
  {
    slug: 'box-breathing', type: WellnessContentType.BREATHING, title: 'Box breathing', durationMinutes: 3, tags: ['anxiety', 'stress'],
    summary: 'A simple, even breathing pattern that many people find calming.',
    body: 'Box breathing uses four equal counts. Go at a pace that feels comfortable and stop if you feel light-headed. It is a self-help technique, not a treatment.',
    steps: ['Breathe in through your nose for a count of four.', 'Hold gently for four.', 'Breathe out slowly for four.', 'Hold for four, then repeat a few times.'],
  },
  {
    slug: 'grounding-5-4-3-2-1', type: WellnessContentType.GROUNDING, title: '5-4-3-2-1 grounding', durationMinutes: 5, tags: ['anxiety', 'overwhelm'],
    summary: 'Use your senses to bring your attention back to the present moment.',
    body: 'When thoughts feel overwhelming, noticing your surroundings can help you feel more anchored. Take your time with each step.',
    steps: ['Notice five things you can see.', 'Four things you can feel.', 'Three things you can hear.', 'Two things you can smell.', 'One thing you can taste.'],
  },
  {
    slug: 'sleep-wind-down', type: WellnessContentType.SLEEP, title: 'A gentle wind-down routine', durationMinutes: 10, tags: ['sleep'],
    summary: 'Small habits in the hour before bed that some people find helpful.',
    body: 'Try keeping a regular bedtime, dimming lights and screens, and writing down tomorrow\'s worries before bed. If sleep problems continue for weeks or affect your day, consider talking to a qualified professional.',
    steps: ['Set a consistent wind-down time.', 'Put screens away or dim them.', 'Write down anything on your mind.', 'Try a few minutes of slow breathing.'],
  },
];

async function main() {
  const { values } = parseArgs({ options: { yes: { type: 'boolean' } } });
  if (process.env['NODE_ENV'] === 'production') {
    console.error('Refusing to seed demo data in production.');
    process.exit(2);
  }
  if (!values.yes) {
    console.error('This adds synthetic demo accounts. Re-run with --yes to continue.');
    process.exit(2);
  }
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error'] });
  try {
    const users = app.get<Model<User>>(getModelToken(User.name));
    const doctors = app.get<Model<DoctorProfile>>(getModelToken(DoctorProfile.name));
    const patients = app.get<Model<PatientProfile>>(getModelToken(PatientProfile.name));
    const verifications = app.get<Model<ProfessionalVerification>>(getModelToken(ProfessionalVerification.name));
    const content = app.get<Model<WellnessContent>>(getModelToken(WellnessContent.name));
    const passwords = app.get(PasswordService);
    const consent = app.get(ConsentService);

    const password = `Demo-${randomBytes(9).toString('base64url')}`;
    const hash = await passwords.hash(password);
    const verifiedAt = new Date();

    const upsertUser = async (email: string, displayName: string, role: Role) => {
      const existing = await users.findOne({ email });
      if (existing) return { user: existing, created: false };
      const user = await users.create({ email, displayName, role, status: AccountStatus.ACTIVE, passwordHash: hash, emailVerifiedAt: verifiedAt });
      await consent.record(user._id.toString(), ConsentType.TERMS, true, { source: 'dev-seed' });
      await consent.record(user._id.toString(), ConsentType.PRIVACY_POLICY, true, { source: 'dev-seed' });
      return { user, created: true };
    };

    const { user: patient, created: patientCreated } = await upsertUser('asha.demo@mindbridge.test', 'Asha (demo patient)', Role.PATIENT);
    if (patientCreated) {
      await patients.create({ userId: patient._id, ageConfirmedAdult: true, preferredLanguage: 'en' });
      await consent.record(patient._id.toString(), ConsentType.AI_PROCESSING, true, { source: 'dev-seed' });
    }

    for (const [i, d] of DOCTORS.entries()) {
      const { user, created } = await upsertUser(d.email, d.name, Role.DOCTOR);
      if (!created) continue;
      const profile = await doctors.create({
        userId: user._id,
        displayName: d.name,
        professionalCategory: d.category,
        qualifications: ['Synthetic demo qualification'],
        registrationNumber: `DEMO-${String(i + 1).padStart(4, '0')}`,
        registrationCouncil: 'Demo Council (synthetic, not a real register)',
        specialties: d.specialties,
        languages: d.languages,
        yearsExperience: d.years,
        bio: 'Fictional professional created for local development. Not a real person.',
        consultationFee: { amount: d.fee, currency: 'INR' },
        consultationModes: [ConsultationMode.ONLINE],
        workingHours: WEEKDAYS,
        verificationStatus: d.status,
        verifiedAt: d.status === DoctorVerificationStatus.APPROVED ? verifiedAt : undefined,
      });
      await verifications.create({
        doctorProfileId: profile._id,
        userId: user._id,
        status: d.status,
        documents: [],
        history: [{ status: d.status, reason: 'Synthetic dev seed', at: verifiedAt }],
      });
    }

    for (const c of CONTENT) {
      await content.updateOne(
        { slug: c.slug },
        {
          $setOnInsert: {
            ...c,
            language: 'en',
            publisher: 'MindBridge demo content (requires clinical review before production)',
            status: ContentStatus.PUBLISHED,
            reviewedAt: verifiedAt,
            publishedAt: verifiedAt,
          },
        },
        { upsert: true },
      );
    }

    const crisis = await app.get(CrisisResourcesService).seedVerified();
    const chunks = await app.get(WellnessService).syncKnowledge();

    console.log('Synthetic demo data ready.');
    console.log(`  Patient: asha.demo@mindbridge.test`);
    console.log(`  Professionals: ${DOCTORS.map((d) => d.email).join(', ')}`);
    console.log(`  Password for accounts created in this run: ${password}`);
    console.log(`  Crisis resources added: ${crisis}. Knowledge chunks synced: ${chunks}.`);
    console.log('  Create an administrator separately with: node dist/cli/seed-admin.js --email <you@example.org>');
  } finally {
    await app.close();
  }
}

main().catch((err: Error) => {
  console.error(`Failed: ${err.message}`);
  process.exit(1);
});
