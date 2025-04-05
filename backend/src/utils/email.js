const nodemailer = require('nodemailer')
const config = require('../config')

const sendEmail = async (options) => {
  // Create a transporter
  const transporter = nodemailer.createTransport({
    service: config.email.service,
    auth: {
      user: config.email.username,
      pass: config.email.password,
    },
  })

  // Define email options
  const mailOptions = {
    from: `Dumpit <${config.email.from}>`,
    to: options.email,
    subject: options.subject,
    html: options.message,
  }

  // Send email
  const info = await transporter.sendMail(mailOptions)

  return info
}

// Email templates
const emailTemplates = {
  // Welcome email template
  welcome: (name) => {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
        <h2 style="color: #333;">Welcome to Dumpit!</h2>
        <p>Hello ${name},</p>
        <p>Thank you for registering with Dumpit, your go-to platform for civil construction materials.</p>
        <p>We're excited to have you on board and look forward to serving you.</p>
        <p>If you have any questions or need assistance, please don't hesitate to contact us.</p>
        <p>Best regards,<br>The Dumpit Team</p>
      </div>
    `
  },

  // Password reset template
  resetPassword: (name, resetUrl) => {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
        <h2 style="color: #333;">Password Reset Request</h2>
        <p>Hello ${name},</p>
        <p>You have requested to reset your password.</p>
        <p>Please click on the link below to reset your password:</p>
        <p><a href="${resetUrl}" style="background-color: #4CAF50; color: white; padding: 10px 15px; text-decoration: none; border-radius: 3px;">Reset Password</a></p>
        <p>This link will expire in 10 minutes.</p>
        <p>If you did not request this, please ignore this email and your password will remain unchanged.</p>
        <p>Best regards,<br>The Dumpit Team</p>
      </div>
    `
  },

  // Order confirmation template
  orderConfirmation: (name, orderNumber, orderDetails) => {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
        <h2 style="color: #333;">Order Confirmation</h2>
        <p>Hello ${name},</p>
        <p>Thank you for your order! Your order has been received and is being processed.</p>
        <p><strong>Order Number:</strong> ${orderNumber}</p>
        <h3>Order Details:</h3>
        ${orderDetails}
        <p>You will receive another email when your order has been shipped.</p>
        <p>Best regards,<br>The Dumpit Team</p>
      </div>
    `
  },

  // Order status update template
  orderStatusUpdate: (name, orderNumber, status) => {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
        <h2 style="color: #333;">Order Status Update</h2>
        <p>Hello ${name},</p>
        <p>Your order <strong>${orderNumber}</strong> has been updated to <strong>${status}</strong>.</p>
        <p>If you have any questions about your order, please contact us.</p>
        <p>Best regards,<br>The Dumpit Team</p>
      </div>
    `
  },
}

module.exports = {
  sendEmail,
  emailTemplates,
}
