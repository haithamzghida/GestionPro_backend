const express = require('express');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const cors = require('cors');
 const app = express();
app.use(bodyParser.json());
app.use(cors());
 app.post('/sendmail', async (req, res) => {
  const { name, email, message } = req.body;
   const transporter = nodemailer.createTransport({
    service: 'outlook',
    auth: {
      user: 'haithamzghidaa@gmail.com',
      pass: 'hait@1234H',
    },
  });
   const mailOptions = {
    from: email,
    to: 'haithamzghidaa@gmail.com',
    subject: `Contact Form: ${name}`,
    text: message,
  };
   try {
    await transporter.sendMail(mailOptions);
    res.status(200).send('Email sent successfully');
  } catch (error) {
    console.error(error);
    res.status(500).send('Error sending email');
  }
});
 const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});