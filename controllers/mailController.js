const dotenv = require("dotenv");
const nodemailer = require("nodemailer");
const User = require("../models/userModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");

dotenv.config({ path: "./config.env" });

const createMail = catchAsync(async (email, subject, htmlBody) => {
  const transporter = nodemailer.createTransport({
    host: `${process.env.EMAIL_HOST}`,
    port: `${process.env.EMAIL_PORT}`,
    secure: true,
    auth: {
      user: `${process.env.EMAIL_USERNAME}`,
      pass: `${process.env.EMAIL_PASSWORD}`,
    },
  });

  const info = await transporter
    .sendMail({
      from: `${process.env.EMAIL_USERNAME}`,
      to: email,
      subject: subject,
      html: htmlBody,
    })
    .then((message) => message)
    .catch(() => false);

  if (info !== false) {
    return true;
  }

  return false;
});

exports.sendMail = catchAsync(async (req, res, next) => {
  const { toEmail, subject, htmlBody } = req.body;
  const { email, password } = req.headers;

  if (!email || !password) {
    return next(new AppError("Please provide email and password!", 400));
  }

  const user = await User.findOne({ email }).select("+password");

  if (user.verified === false) {
    return next(new AppError("Please verify your email", 400));
  }

  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError("Incorrect email or password", 401));
  }

  const mailSent = await createMail(toEmail, subject, htmlBody);

  if (mailSent) {
    res.status(200).json({
      status: "success",
      message: "Mail sent successfully",
    });
  } else {
    return next(new AppError("Mail not sent", 500));
  }
});
