// Email Dispatch & Direct Messaging Service
// Sender: Anubhab Nandi (Super Creator) <anubhabnandi12@gmail.com>

export const SUPER_CREATOR_EMAIL = 'anubhabnandi12@gmail.com';
export const SUPER_CREATOR_NAME = 'Anubhab Nandi';

export const emailService = {
  // AI Welcome Message Generator for new administrators
  generateAiWelcomeMessage({ name = '', roleId = '', roleName = '', title = '', tone = 'executive' }) {
    const cleanName = name.trim() || 'Colleague';
    const cleanTitle = title.trim() || roleName || 'Administrator';

    switch (tone) {
      case 'clinical':
        return `Welcome ${cleanName}. On behalf of the MindBridge Clinical Governance Board, you are appointed as ${cleanTitle}. Your core mandate centers on evaluating practitioner registrations, reviewing medical credentials with state councils, and maintaining our highest standards of patient safety and clinical excellence.`;

      case 'qa':
        return `Hi ${cleanName}, welcome to the MindBridge Quality Assurance & Engineering team as ${cleanTitle}. You have been provisioned tester privileges with direct access to our live QA Bug Desk and Task Bar. Please utilize our in-app screen recording and viewport capture tools to audit user journeys across video telehealth, booking flows, and emergency SOS protocols.`;

      case 'influencer':
        return `Welcome ${cleanName}! I am thrilled to bring you aboard as ${cleanTitle}. You are empowered to build and launch custom promotional campaigns, track audience conversions, and champion MindBridge's mission to make compassionate, clinically accredited mental healthcare accessible to everyone.`;

      case 'warm':
        return `Hi ${cleanName}, I'm genuinely excited to have you join MindBridge as our ${cleanTitle}. Our team is building a clinical ecosystem that transforms patient lives every single day, and having your expertise, values, and dedication with us makes all the difference. Feel free to reach out to me directly at anubhabnandi12@gmail.com whenever you need guidance. Welcome aboard!`;

      case 'urgent':
        return `Greetings ${cleanName}, your administrative clearance as ${cleanTitle} has been authorized immediately by Super Creator Anubhab Nandi. Please access the admin console, verify your two-factor authentication, and review the urgent priority queues awaiting your clearance.`;

      case 'executive':
      default:
        return `Dear ${cleanName}, as Founder & Super Creator of MindBridge, I am pleased to welcome you to our senior administrative council as ${cleanTitle}. In this capacity, you are vested with platform-wide governance authority, administrative user provisioning, and operational oversight across our clinical healthcare modules. Please configure your two-factor security credentials immediately upon initial sign-in. I look forward to working closely with you.`;
    }
  },

  // Generate Admin Invitation Email & Direct Messaging Content
  generateAdminInvitation({ toEmail, recipientName, roleName, title, permissions = [], customNote }) {
    const loginUrl = 'https://anubhab12-bot.github.io/mindbridge/admin/';
    const subject = `Welcome to MindBridge: Administrative Access Granted by ${SUPER_CREATOR_NAME}`;
    
    const permissionsText = permissions.length > 0 
      ? permissions.map(p => `  • ${p}`).join('\r\n')
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

${customNote ? `PERSONAL MESSAGE FROM ANUBHAB NANDI:\r\n"${customNote}"\r\n\r\n` : ''}INSTRUCTIONS TO GET STARTED:
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
    const webGmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(toEmail)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    const outlookUrl = `https://outlook.live.com/mail/0/deeplink/compose?to=${encodeURIComponent(toEmail)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    const whatsappText = `Welcome to MindBridge! You have been granted administrative access as ${roleName} by Super Creator ${SUPER_CREATOR_NAME} (${SUPER_CREATOR_EMAIL}). Access Portal: ${loginUrl} (User: ${toEmail})`;
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(whatsappText)}`;
    const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(loginUrl)}&text=${encodeURIComponent(`Administrative Access Granted to MindBridge for ${recipientName} (${roleName}) by ${SUPER_CREATOR_NAME}`)}`;

    return {
      to: toEmail,
      from: `${SUPER_CREATOR_NAME} <${SUPER_CREATOR_EMAIL}>`,
      subject,
      body,
      mailtoUrl,
      webGmailUrl,
      outlookUrl,
      whatsappUrl,
      telegramUrl,
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
    const webGmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(testerEmail)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    return {
      to: testerEmail,
      from: `${SUPER_CREATOR_NAME} <${SUPER_CREATOR_EMAIL}>`,
      subject,
      body,
      mailtoUrl,
      webGmailUrl,
    };
  },
};
