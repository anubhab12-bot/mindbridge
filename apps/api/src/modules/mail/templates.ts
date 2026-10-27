export type MailTemplate =
  | 'verify-email'
  | 'password-reset'
  | 'password-changed'
  | 'doctor-application-received'
  | 'doctor-verification-update'
  | 'appointment-update'
  | 'appointment-reminder'
  | 'new-secure-message'
  | 'account-deletion-scheduled';

export type TemplateData = Record<string, string | number | undefined>;

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

const FOOTER =
  'If you are in immediate danger or thinking about harming yourself, please contact your local emergency number ' +
  'or visit the Safety and crisis support page in MindBridge.';

function layout(title: string, paragraphs: string[], action?: { label: string; url: string }) {
  const text = [title, '', ...paragraphs, action ? `${action.label}: ${action.url}` : '', '', FOOTER].join('\n');
  const html = `<!doctype html><html><body style="font-family:system-ui,sans-serif;background:#f6f7f5;padding:24px;color:#1f2a2a">
<div style="max-width:560px;margin:auto;background:#fff;border-radius:16px;padding:28px">
<h1 style="font-size:20px;color:#0f5f5c">${escapeHtml(title)}</h1>
${paragraphs.map((p) => `<p style="line-height:1.6">${escapeHtml(p)}</p>`).join('')}
${action ? `<p><a href="${escapeHtml(action.url)}" style="display:inline-block;background:#0f766e;color:#fff;padding:12px 20px;border-radius:999px;text-decoration:none">${escapeHtml(action.label)}</a></p>` : ''}
<p style="font-size:12px;color:#5b6b6b;margin-top:24px">${escapeHtml(FOOTER)}</p></div></body></html>`;
  return { subject: title, text, html };
}

/** Templates deliberately avoid clinical or conversation details; they link back into the app. */
export function renderTemplate(template: MailTemplate, d: TemplateData) {
  const app = String(d['appUrl'] ?? '');
  const name = String(d['name'] ?? 'there');
  switch (template) {
    case 'verify-email':
      return layout(
        'Confirm your email for MindBridge',
        [`Hi ${name}, please confirm your email address to finish setting up your account. This link expires in 24 hours.`],
        { label: 'Confirm email', url: `${app}/verify-email?token=${encodeURIComponent(String(d['token']))}` },
      );
    case 'password-reset':
      return layout(
        'Reset your MindBridge password',
        [
          `Hi ${name}, we received a request to reset your password. This link expires in 30 minutes.`,
          'If you did not request this, you can ignore this email.',
        ],
        { label: 'Choose a new password', url: `${app}/reset-password?token=${encodeURIComponent(String(d['token']))}` },
      );
    case 'password-changed':
      return layout('Your MindBridge password was changed', [
        `Hi ${name}, your password was just changed and other sessions were signed out.`,
        'If this was not you, reset your password immediately and contact support.',
      ]);
    case 'doctor-application-received':
      return layout('We received your professional application', [
        `Hi ${name}, thank you for applying to offer consultations on MindBridge.`,
        'Our team will review your registration details and documents. You will not appear to patients until verification is approved.',
      ]);
    case 'doctor-verification-update':
      return layout(
        'Update on your professional verification',
        [`Hi ${name}, your verification status is now: ${String(d['status'])}.`, String(d['message'] ?? '')],
        { label: 'Open MindBridge', url: `${app}/doctor/verification-pending` },
      );
    case 'appointment-update':
      return layout(
        'Appointment update',
        [`Hi ${name}, an appointment on ${String(d['when'])} is now ${String(d['status']).toLowerCase()}.`],
        { label: 'View appointments', url: `${app}${String(d['path'] ?? '/')}` },
      );
    case 'appointment-reminder':
      return layout(
        'Appointment reminder',
        [`Hi ${name}, this is a reminder of your appointment on ${String(d['when'])}.`],
        { label: 'View appointment', url: `${app}${String(d['path'] ?? '/')}` },
      );
    case 'new-secure-message':
      return layout(
        'You have a new secure message',
        [`Hi ${name}, you have a new message in MindBridge. For your privacy, message content is only shown after you sign in.`],
        { label: 'Open messages', url: `${app}${String(d['path'] ?? '/')}` },
      );
    case 'account-deletion-scheduled':
      return layout('Your account deletion is scheduled', [
        `Hi ${name}, your account is scheduled for deletion on ${String(d['when'])}.`,
        'You can cancel this before that date by signing in and choosing Cancel deletion under Settings, Privacy. Some records may be retained where the law requires it.',
      ]);
  }
}
