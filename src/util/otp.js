
import Twilio from "twilio";

var dict = {};

var accountSid = process.env.TWILIO_ACCOUNT_SID;
var authToken = process.env.TWILIO_AUTH_TOKEN;
const client = new Twilio("ACa6213af064b", "");

export function generateOtp(number) {
  return new Promise((resolve, reject) => {
    try {
      let min = 100000;
      let max = 999999;
      let my_otp = 123456;
      dict[number] = { code: my_otp, expiry: new Date().getTime() + 60000 };
  
      sendOtp(
        number,
        "Your verification code for is " + my_otp
      ).then((res) => {
        console.log("send otp response")
        console.log(res)
        resolve(true)
      }).catch((err) => {
        console.log(err)
        resolve(false)
      })


    } catch (err) {
      console.log("reaching", err)
      resolve(false);
    }
  })

}
function sendOtp(number, body) {
  return new Promise((resolve, reject) => {
    try {

      //Sending Reset OTP to user number
      client.messages.create({
        body: body,
        to: number,
        from: process.env.TWILIO_PHONE_NO

      }).then((data) => {
        resolve(true)
      }).catch((err) => {
        console.log("testing")
        console.log(err)
        reject(err)

      })


    }
    catch (err) {
      console.log(err)
      reject(err)
    }


  });
}
export async function verifyOTP(number, otp, context) {

  if (dict[number] == undefined || dict[number] == {}) {
    return {
      status: false,
      response: "OTP code invalid"
    }
  }
  const isValid = dict[number]["expiry"] - new Date().getTime() > 0;
  if (!isValid) {
    delete dict[number];

    return {
      status: false,
      response: "OTP code expired"
    }
  }
  const res = dict[number]["code"] == otp;
  if (res == true) {
    delete dict[number];
    const { collections } = context;
    const { users } = collections;

    const userObj = await users.updateOne({ "phone": number }, { $set: { "phoneVerified": "true" } })

    return {
      status: true,
      response: "Verified successfully"
    }
  } else {
    return {
      status: false,
      response: "Invalid code entered"
    }

  }

}
