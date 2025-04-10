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

// Common styles for all emails
const emailStyles = `
  /* Base styles */
  body, html { margin: 0; padding: 0; font-family: 'Arial', sans-serif; }
  
  /* Container styles */
  .email-container {
    max-width: 600px;
    margin: 0 auto;
    padding: 25px;
    border-radius: 8px;
    border: 1px solid #EAEAEA;
    background-color: #ffffff;
  }
  
  /* Header styles */
  .email-header {
    text-align: center;
    padding-bottom: 20px;
    border-bottom: 2px solid #FF9800;
    margin-bottom: 25px;
  }
  
  .logo-placeholder {
    background-color: #FF9800;
    color: white;
    font-weight: bold;
    padding: 10px 20px;
    border-radius: 5px;
    display: inline-block;
    margin-bottom: 15px;
  }
  
  /* Content styles */
  .email-content {
    color: #333333;
    line-height: 1.6;
  }
  
  h2 {
    color: #FF6D00;
    margin-top: 0;
  }
  
  /* Button styles */
  .button {
    background-color: #FF9800;
    color: white !important;
    padding: 12px 25px;
    text-decoration: none;
    border-radius: 5px;
    font-weight: bold;
    display: inline-block;
    margin: 15px 0;
    text-align: center;
  }
  
  .button:hover {
    background-color: #F57C00;
  }
  
  /* Code box for tokens */
  .code-box {
    background-color: #FFF3E0;
    border: 1px solid #FFE0B2;
    border-radius: 4px;
    padding: 12px;
    margin: 15px 0;
    font-family: monospace;
    position: relative;
    overflow: hidden;
  }
  
  .token-text {
    color: #E65100;
    font-size: 16px;
    word-break: break-all;
  }
  
  .copy-hint {
    color: #757575;
    font-size: 12px;
    margin-top: 5px;
    font-style: italic;
  }
  
  /* Footer styles */
  .email-footer {
    margin-top: 30px;
    padding-top: 20px;
    border-top: 1px solid #EAEAEA;
    color: #757575;
    font-size: 14px;
  }
  
  /* Responsive adjustments */
  @media only screen and (max-width: 480px) {
    .email-container {
      padding: 15px;
    }
    
    h2 {
      font-size: 20px;
    }
    
    .button {
      display: block;
      text-align: center;
    }
  }
`;

// Email templates
const emailTemplates = {
  // Welcome email template
  welcome: (name) => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to Dumpit</title>
        <style>
          ${emailStyles}
        </style>
      </head>
      <body>
        <div class="email-container">
          <div class="email-header">
            <div class="logo-placeholder">DUMPIT</div>
            <h2>Welcome to Dumpit!</h2>
          </div>
          
          <div class="email-content">
            <p>Hello ${name},</p>
            <p>Thank you for registering with Dumpit, your go-to platform for civil construction materials.</p>
            <p>We're excited to have you on board and look forward to serving you.</p>
            <p>If you have any questions or need assistance, please don't hesitate to contact us.</p>
            
            <a href="#" class="button">Explore Dumpit</a>
          </div>
          
          <div class="email-footer">
            <p>Best regards,<br>The Dumpit Team</p>
          </div>
        </div>
      </body>
      </html>
    `;
  },

  // Password reset template
  resetPassword: (name, webUrl, resetToken) => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset Request</title>
        <style>
          ${emailStyles}
        </style>
      </head>
      <body>
        <div class="email-container">
          <div class="email-header">
            <div class="logo-placeholder">DUMPIT</div>
            <h2>Password Reset Request</h2>
          </div>
          
          <div class="email-content">
            <p>Hello ${name},</p>
            <p>You have requested to reset your password. Please use the link below or the reset token provided.</p>
            
            <a href="${webUrl}" class="button">Reset Password</a>
            
            <p><strong>Your Reset Token:</strong></p>
            <div class="code-box">
              <div class="token-text">${resetToken}</div>
              <div class="copy-hint">Click to copy</div>
            </div>
            
            <p>This reset link and token will expire in 10 minutes.</p>
            <p>If you did not request this, please ignore this email and your password will remain unchanged.</p>
          </div>
          
          <div class="email-footer">
            <p>Best regards,<br>The Dumpit Team</p>
          </div>
        </div>
      </body>
      </html>
    `;
  },

  // Order confirmation template
  orderConfirmation: (name, orderNumber, orderDetails) => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Order Confirmation</title>
        <style>
          ${emailStyles}
          
          .order-details {
            background-color: #FFF3E0;
            border-radius: 5px;
            padding: 15px;
            margin: 15px 0;
          }
          
          .order-number {
            background-color: #FF9800;
            color: white;
            display: inline-block;
            padding: 5px 10px;
            border-radius: 4px;
            font-weight: bold;
          }
        </style>
      </head>
      <body>
        <div class="email-container">
          <div class="email-header">
            <div class="logo-placeholder">DUMPIT</div>
            <h2>Order Confirmation</h2>
          </div>
          
          <div class="email-content">
            <p>Hello ${name},</p>
            <p>Thank you for your order! Your order has been received and is being processed.</p>
            
            <p><strong>Order Number: </strong><span class="order-number">${orderNumber}</span></p>
            
            <div class="order-details">
              <h3 style="color: #E65100; margin-top: 0;">Order Details:</h3>
              ${orderDetails}
            </div>
            
            <p>You will receive another email when your order has been shipped.</p>
            
            <a href="#" class="button">Track Your Order</a>
          </div>
          
          <div class="email-footer">
            <p>Best regards,<br>The Dumpit Team</p>
          </div>
        </div>
      </body>
      </html>
    `;
  },

  // Order status update template
  orderStatusUpdate: (name, orderNumber, status) => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Order Status Update</title>
        <style>
          ${emailStyles}
          
          .status-badge {
            display: inline-block;
            padding: 6px 12px;
            border-radius: 20px;
            font-weight: bold;
            background-color: #FF9800;
            color: white;
            margin: 5px 0;
          }
          
          .order-number {
            background-color: #FF9800;
            color: white;
            display: inline-block;
            padding: 5px 10px;
            border-radius: 4px;
            font-weight: bold;
          }
        </style>
      </head>
      <body>
        <div class="email-container">
          <div class="email-header">
            <div class="logo-placeholder">DUMPIT</div>
            <h2>Order Status Update</h2>
          </div>
          
          <div class="email-content">
            <p>Hello ${name},</p>
            <p>Your order <span class="order-number">${orderNumber}</span> has been updated.</p>
            
            <p>Current Status: <span class="status-badge">${status}</span></p>
            
            <p>If you have any questions about your order, please contact us.</p>
            
            <a href="#" class="button">View Order Details</a>
          </div>
          
          <div class="email-footer">
            <p>Best regards,<br>The Dumpit Team</p>
          </div>
        </div>
      </body>
      </html>
    `;
  },
};

module.exports = {
  sendEmail,
  emailTemplates,
};