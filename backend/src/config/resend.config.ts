import * as dotenv from 'dotenv';

import { Resend } from 'resend';

// LOAD ENV
dotenv.config();

export const resend = new Resend(process.env.RESEND_API_KEY);
