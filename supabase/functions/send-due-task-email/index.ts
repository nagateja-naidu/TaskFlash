// This is the final, corrected version of your index.ts file

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";
const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY");

// These are the permission headers the browser needs
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Allows any origin
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // This part is new. It handles the browser's pre-flight "permission" request.
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { taskName, userEmail } = await req.json();

    const emailPayload = {
      sender: {
        name: "TaskFlash Notifier",
        email: "taskflash92@gmail.com",
      },
      to: [{ email: userEmail }],
      subject: `Reminder: Your task "${taskName}" is due in 1 hour!`,
      htmlContent: `
  <!DOCTYPE html>
  <html>
  <head>
    <style>
      body { font-family: sans-serif; color: #333; }
      .container { padding: 20px; border: 1px solid #ddd; border-radius: 8px; max-width: 500px; margin: auto; }
      .header { font-size: 24px; font-weight: bold; color: #5B21B6; }
      .task-name { font-weight: bold; }
      .footer { font-size: 12px; color: #777; margin-top: 20px; }
    </style>
  </head>
  <body>
    <div class="container">
      <p class="header">Task Reminder</p>
      <p>Hi there,</p>
      <p>This is a friendly reminder that your task, "<span class="task-name">${taskName}</span>", is due in approximately one hour.</p>
      <p>Please complete it soon!</p>
      <br>
      <p>Best,</p>
      <p>The TaskFlash Team</p>
      <p class="footer">You are receiving this email because you have a task due in TaskFlash.</p>
    </div>
  </body>
  </html>
`,
    };

    const response = await fetch(BREVO_API_URL, {
        method: 'POST',
        headers: {
            'accept': 'application/json',
            'api-key': BREVO_API_KEY!,
            'content-type': 'application/json'
        },
        body: JSON.stringify(emailPayload)
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("Brevo API Error:", errorBody);
      // Return errors with the CORS headers
      return new Response(JSON.stringify({ error: 'Failed to send email' }), { status: 500, headers: corsHeaders });
    }

    const data = await response.json();
    // Return the successful response with the CORS headers
    return new Response(JSON.stringify(data), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err) {
    console.error("Function Error:", err.message);
    // Return errors with the CORS headers
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});