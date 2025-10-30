import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhone = process.env.TWILIO_PHONE_NUMBER;

let twilioClient = null;

// Initialize Twilio only if credentials are provided
if (accountSid && authToken && twilioPhone) {
  try {
    twilioClient = twilio(accountSid, authToken);
    console.log('✓ Twilio initialized');
  } catch (error) {
    console.warn('⚠️ Twilio initialization failed:', error.message);
  }
}

export const sendSMS = async (phoneNumber, message) => {
  if (!twilioClient) {
    console.warn('⚠️ Twilio not configured, SMS not sent');
    console.log('📱 SMS would be sent to:', phoneNumber);
    console.log('💬 Message:', message.substring(0, 100) + '...');
    // Don't throw error, just log (allows app to work without Twilio)
    return { success: false, message: 'Twilio not configured' };
  }

  try {
    // Format phone number (add +91 for India if not present)
    let formattedPhone = phoneNumber.replace(/\D/g, '');
    if (!formattedPhone.startsWith('91') && formattedPhone.length === 10) {
      formattedPhone = '91' + formattedPhone;
    }
    formattedPhone = '+' + formattedPhone;

    const result = await twilioClient.messages.create({
      body: message,
      from: twilioPhone,
      to: formattedPhone
    });

    console.log(`✓ SMS sent to ${formattedPhone}, SID: ${result.sid}`);
    return { success: true, sid: result.sid };
  } catch (error) {
    console.error('Twilio SMS error:', error.message);
    throw new Error(`Failed to send SMS: ${error.message}`);
  }
};