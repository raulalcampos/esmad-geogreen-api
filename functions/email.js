// require/import modules and configuration
const nodemailer = require("nodemailer");

// function to send some Email
async function send(type, to, name, subject, message){
    // types: 0: Account Checker, 1: Recover Password; 2: Password Updated; 3: Deleted Account; 4: Contact Notifier To Admin
    let transporter = nodemailer.createTransport({
        host: 'smtp.hostinger.com',
        port: 465,
        secure: true,
        auth: {
          user: 'dtam-pi2@esmad.raulcampos.net',
          pass: 'DTAM@pi2'
        },
        tls: {
            rejectUnauthorized: false
        }
    });
    let mailOptions = {};
    if(type == 0){
        mailOptions = {
            from: {
                name: name,
                address: 'dtam-pi2@esmad.raulcampos.net'
            },
            to: to,
            subject: subject,
            html: `<p> Hello, ${message.username}! </p>
            <p> Thank you very much for creating an GeoGreen account! </p>
            <p> In order to use our application, please verify your account by clicking on this link: <u>https://esmad.raulcampos.net/dtam-pi2/checkaccount?userid=${message.userId}&verificationcode=${message.verificationCode}</u> ! </p>
            <p></p>
            <p><strong> The GeoGreen Team 💚 ! </strong></p>`
        };
    } else if (type == 1){
        mailOptions = {
            from: {
                name: name,
                address: 'dtam-pi2@esmad.raulcampos.net'
            },
            to: to,
            subject: subject,
            text : message
        };
    } else if (type == 2){
        mailOptions = {
            from: {
                name: name,
                address: 'dtam-pi2@esmad.raulcampos.net'
            },
            to: to,
            subject: subject,
            html: `<p> Hello, ${message.username}! </p>
            <p> Your GeoGreen account security setthings has been successfully updated. </p>
            <p> This is an automatic email, please do not reply. </p>
            <p></p>
            <p><strong> The GeoGreen Team 💚 ! </strong></p>`
        };
    } else if (type == 3){
        mailOptions = {
            from: {
                name: name,
                address: 'dtam-pi2@esmad.raulcampos.net'
            },
            to: to,
            subject: subject,
            html: `<p> Hello, ${message.username}! </p>
            <p> Your GeoGreen account has been successfully deleted. </p>
            <p> Thank you so much for all the time you spent with us, we will be here for you whenever you want to come back! 🤗 </p>
            <p> This is an automatic email, please do not reply.</p>
            <p></p>
            <p><strong> The GeoGreen Team 💚 ! </strong></p>`
        };
    } else if (type == 4){
        mailOptions = {
            from: {
                name: name,
                address: 'dtam-pi2@esmad.raulcampos.net'
            },
            to: to,
            subject: subject,
            html: `<p> Hello, Administrator! </p>
            <p><strong> You have a new contact message from ${message.fromUser}. </strong></p>
            <p> At ${message.time.day}/${message.time.month}/${message.time.year} (${message.time.hour}:${message.time.minute}), <strong>${message.fromUser}</strong> contact for reason "<em>${message.subject}</em>". </p>
            <p> Message: "<em>${message.message}</em>".</p>
            <p> To reply to the user use the email: <u>${message.emailUser}</u>.</p>
            <p></p>
            <p> This is an automatic email, please do not reply.</p>`
        };
    } else {
        mailOptions = {
            from: {
                name: name,
                address: 'dtam-pi2@esmad.raulcampos.net'
            },
            to: to,
            subject: subject,
            text : message
        };
    };
    transporter.sendMail(mailOptions, function (error, sucess) {
        if(error){
          console.log(error);
          return ('Error while sending email' + error)
        } else {
          console.log("Email successfully sent to " + mailOptions.to + ".");
          return ('Email successfully sent!')
        }
      });
}

// export functions
module.exports = { send }