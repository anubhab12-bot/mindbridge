// Email Dispatch & Notification Service
// Sender: Anubhab Nandi (Super Creator) <anubhabnandi12@gmail.com>

export const SUPER_CREATOR_EMAIL = 'anubhabnandi12@gmail.com';
export const SUPER_CREATOR_NAME = 'Anubhab Nandi';

export const emailService = {
  // Generate Admin Invitation Email
  generateAdminInvitation({ toEmail, recipientName, roleName, title, permissions = [], customNote }) {
    const loginUrl = 'https://anubhab12-bot.github.io/mindbridge/admin/';
    const subject = `Welcome to MindBridge: Administrative Access Granted by ${SUPER_CREATOR_NAME}`;
    
    const permissionsText = permissions.length > 0 
      ? permissions.map(p => `  • ${p}`).join('\n')
      : '  • General Administrative Management';

    const body = `Dear ${recipientName},

You have been officially granted administrative privileges on the MindBridge Healthcare Platform by the Super Creator, ${SUPER_CREATOR_NAME} (${SUPER_CREATOR_EMAIL}).

==================================================
ACCESS DETAILS & SECURITY CREDENTIALS
==================================================
Assigned Role: ${roleName}
Title / Department: ${title || 'Platform Administration'}
Access Portal URL: ${loginUrl}
Granted By: ${SUPER_CREATOR_NAME} (${SUPER_CREATOR_EMAIL})

YOUR ACTIVE PERMISSIONS:
${permissionsText}

${customNote ? `PERSONAL MESSAGE FROM ANUBHAB NANDI:\n"${customNote}"\n\n` : ''}INSTRUCTIONS TO GET STARTED:
1. Open the MindBridge Admin Portal: ${loginUrl}
2. Sign in with your registered email: ${toEmail}
3. Configure your 2FA (Two-Factor Authentication) under Account Security
4. Review your assigned department queue (Doctor Verification, QA Bug Desk, or Operations)

If you have any questions or require expanded privileges, reply directly to this email at ${SUPER_CREATOR_EMAIL}.

Warm regards,

${SUPER_CREATOR_NAME}
Super Creator & Founder, MindBridge
Email: ${SUPER_CREATOR_EMAIL}
App: https://anubhab12-bot.github.io/mindbridge/`;

    const mailtoUrl = `mailto:${encodeURIComponent(toEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    return {
      to: toEmail,
      from: `${SUPER_CREATOR_NAME} <${SUPER_CREATOR_EMAIL}>`,
      subject,
      body,
      mailtoUrl,
    };
  },

  // Generate Bug Status Update Notification for Tester User
  generateBugStatusNotification({ ticket, newStatus, resolutionNotes }) {
    const testerEmail = ticket.testerEmail || 'tester@mindbridge.health';
    const testerName = ticket.reportedBy || 'QA Tester';
    const liveAppUrl = 'https://anubhab12-bot.github.io/mindbridge/';
    const adminPortalUrl = 'https://anubhab12-bot.github.io/mindbridge/admin/';
    
    const statusLabel = newStatus === 'fixed' ? 'FIXED (Resolved)' : newStatus === 'cant_fix' ? "CAN'T FIX (Blocked / By Design)" : newStatus.toUpperCase();
    const subject = `[${ticket.id}] QA Bug Status Update: ${statusLabel} - Retest Required`;

    const body = `Hi ${testerName},

Your reported bug ticket [${ticket.id}] has been triaged and updated on the MindBridge QA Task Bar.

==================================================
BUG TICKET DETAILS
==================================================
Ticket ID: ${ticket.id}
Summary: ${ticket.title}
Component: ${ticket.component || 'Core App'}
Severity: ${(ticket.severity || 'Normal').toUpperCase()}
New Status: ${statusLabel}
Updated By: ${SUPER_CREATOR_NAME} (${SUPER_CREATOR_EMAIL})

RESOLUTION / TRIAGE NOTES:
${resolutionNotes || (newStatus === 'fixed' ? 'The issue has been resolved in the codebase and deployed to staging/live.' : 'Marked as unfixable or expected platform behavior as detailed.')}

ACTION REQUIRED (TESTER):
1. Please open the live app to re-test: ${liveAppUrl}
2. Follow your reproduction steps to verify if the anomaly persists.
3. Once verified, visit the Admin QA Desk (${adminPortalUrl}) and mark this ticket as:
   • "Retested & Verified (Closed)" if fixed
   • Or reopen with fresh debug logs if the issue still reproduces.

Thank you for ensuring the stability and safety of MindBridge!

Best regards,

${SUPER_CREATOR_NAME}
Super Creator, MindBridge
Email: ${SUPER_CREATOR_EMAIL}`;

    const mailtoUrl = `mailto:${encodeURIComponent(testerEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    return {
      to: testerEmail,
      from: `${SUPER_CREATOR_NAME} <${SUPER_CREATOR_EMAIL}>`,
      subject,
      body,
      mailtoUrl,
    };
  },
};
