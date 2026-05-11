const nodemailer = require('nodemailer');

let transporter;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '465'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return transporter;
}

function formatDeadline(deadline) {
  if (!deadline) return 'No deadline set';
  return new Date(deadline).toLocaleString('en-BD', { timeZone: 'Asia/Dhaka' });
}

async function sendMail(to, subject, html) {
  try {
    await getTransporter().sendMail({
      from: process.env.SMTP_FROM,
      to,
      subject,
      html,
    });
  } catch (err) {
    console.error('Email send failed:', err.message);
  }
}

async function sendTaskAssigned(email, name, taskTitle, deadline) {
  const html = `
    <div style="font-family: sans-serif; max-width: 500px; margin: auto; background: #1a1a2e; color: #fff; border-radius: 12px; padding: 24px;">
      <h2 style="color: #a78bfa;">📋 New Task Assigned</h2>
      <p>Hi <strong>${name}</strong>,</p>
      <p>You have been assigned a new task:</p>
      <div style="background: #16213e; border-left: 4px solid #7c3aed; padding: 16px; border-radius: 8px; margin: 16px 0;">
        <strong>${taskTitle}</strong><br/>
        <span style="color: #94a3b8;">Deadline: ${formatDeadline(deadline)}</span>
      </div>
      <p>Login to Vapor World CRM to view details and update your progress.</p>
      <p style="color: #64748b; font-size: 12px;">Vapor World Internal CRM</p>
    </div>
  `;
  await sendMail(email, `New Task: ${taskTitle}`, html);
}

async function sendReminder(email, name, taskTitle, status, deadline) {
  const html = `
    <div style="font-family: sans-serif; max-width: 500px; margin: auto; background: #1a1a2e; color: #fff; border-radius: 12px; padding: 24px;">
      <h2 style="color: #f59e0b;">⏰ Task Reminder</h2>
      <p>Hi <strong>${name}</strong>,</p>
      <p>This is a reminder about your pending task:</p>
      <div style="background: #16213e; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 8px; margin: 16px 0;">
        <strong>${taskTitle}</strong><br/>
        <span style="color: #94a3b8;">Status: ${status.replace('_', ' ').toUpperCase()}</span><br/>
        <span style="color: #f87171;">Deadline: ${formatDeadline(deadline)}</span>
      </div>
      <p>Please update your task status as soon as possible.</p>
      <p style="color: #64748b; font-size: 12px;">Vapor World Internal CRM</p>
    </div>
  `;
  await sendMail(email, `Reminder: ${taskTitle}`, html);
}

async function sendOverdueAlert(email, name, taskTitle, deadline) {
  const html = `
    <div style="font-family: sans-serif; max-width: 500px; margin: auto; background: #1a1a2e; color: #fff; border-radius: 12px; padding: 24px;">
      <h2 style="color: #ef4444;">🚨 Task Overdue</h2>
      <p>Hi <strong>${name}</strong>,</p>
      <p>Your task is <strong style="color: #ef4444;">OVERDUE</strong>:</p>
      <div style="background: #16213e; border-left: 4px solid #ef4444; padding: 16px; border-radius: 8px; margin: 16px 0;">
        <strong>${taskTitle}</strong><br/>
        <span style="color: #f87171;">Was due: ${formatDeadline(deadline)}</span>
      </div>
      <p>Please complete and update this task immediately.</p>
      <p style="color: #64748b; font-size: 12px;">Vapor World Internal CRM</p>
    </div>
  `;
  await sendMail(email, `OVERDUE: ${taskTitle}`, html);
}

async function sendAnnouncementReminder(email, name, announcementTitle) {
  const html = `
    <div style="font-family: sans-serif; max-width: 500px; margin: auto; background: #1a1a2e; color: #fff; border-radius: 12px; padding: 24px;">
      <h2 style="color: #3b82f6;">📢 Announcement Requires Your Acknowledgement</h2>
      <p>Hi <strong>${name}</strong>,</p>
      <p>You have not yet acknowledged the following announcement:</p>
      <div style="background: #16213e; border-left: 4px solid #3b82f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
        <strong>${announcementTitle}</strong>
      </div>
      <p>Please log in to Vapor World CRM and acknowledge this announcement.</p>
      <p style="color: #64748b; font-size: 12px;">Vapor World Internal CRM</p>
    </div>
  `;
  await sendMail(email, `Please Acknowledge: ${announcementTitle}`, html);
}

module.exports = { sendTaskAssigned, sendReminder, sendOverdueAlert, sendAnnouncementReminder };
