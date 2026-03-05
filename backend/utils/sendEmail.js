const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
    let transporter;

    // Check if custom SMTP configurations are loaded in the environment
    if (process.env.EMAIL_HOST && process.env.EMAIL_USER) {
        transporter = nodemailer.createTransport({
            host: process.env.EMAIL_HOST,
            port: process.env.EMAIL_PORT || 2525,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });
    } else {
        // Fallback to auto-generating a secure Ethereal testing account!
        let testAccount = await nodemailer.createTestAccount();
        transporter = nodemailer.createTransport({
            host: "smtp.ethereal.email",
            port: 587,
            secure: false, // true for 465, false for other ports
            auth: {
                user: testAccount.user, // generated ethereal user
                pass: testAccount.pass, // generated ethereal password
            },
        });
    }

    // send mail with defined transport object
    const message = {
        from: `${process.env.FROM_NAME || 'TOUCH Boutique'} <${process.env.FROM_EMAIL || 'noreply@touchboutique.com'}>`,
        to: options.email,
        subject: options.subject,
        text: options.message
    };

    const info = await transporter.sendMail(message);

    console.log('Message sent: %s', info.messageId);

    // Log the Ethereal Preview URL strictly if testing
    if (!process.env.EMAIL_HOST) {
        console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
    }
};

module.exports = sendEmail;
