import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { getSupabaseAdminOptional } from "@/lib/supabase-admin";
import { serverEnv } from "@/lib/env/server";

const CONTACT_EMAIL = "waveandwaders@gmail.com";

// Simple in-memory rate limiting (resets on server restart)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour
const MAX_REQUESTS_PER_WINDOW = 3; // Max 3 submissions per hour per IP

function checkRateLimit(identifier: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(identifier);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(identifier, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (record.count >= MAX_REQUESTS_PER_WINDOW) {
    return false;
  }

  record.count++;
  return true;
}

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (ch) => {
    switch (ch) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      case "'":
        return "&#39;";
      default:
        return ch;
    }
  });

export async function POST(request: NextRequest) {
  try {
    const contentLength = request.headers.get("content-length");
    if (contentLength && Number.parseInt(contentLength, 10) > 10_000) {
      return NextResponse.json({ error: "Payload too large" }, { status: 413 });
    }

    // Rate limiting by IP
    const forwardedFor = request.headers.get("x-forwarded-for");
    const ip =
      (forwardedFor ? forwardedFor.split(",")[0]?.trim() : null) ||
      request.headers.get("x-real-ip") ||
      "unknown";
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: "Too many submissions. Please try again later." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const name = typeof body?.name === "string" ? body.name : "";
    const email = typeof body?.email === "string" ? body.email : "";
    const subject = typeof body?.subject === "string" ? body.subject : "";
    const message = typeof body?.message === "string" ? body.message : "";

    // Validate required fields
    if (!name || !email || !subject || !message) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email address" },
        { status: 400 }
      );
    }

    // Validate message length
    if (message.length < 10) {
      return NextResponse.json(
        { error: "Message must be at least 10 characters long" },
        { status: 400 }
      );
    }

    if (message.length > 5000) {
      return NextResponse.json(
        { error: "Message is too long (max 5000 characters)" },
        { status: 400 }
      );
    }

    // Basic spam detection
    const spamPatterns = [
      /\b(viagra|cialis|casino|lottery|winner)\b/i,
      /(https?:\/\/.*){3,}/i, // Multiple URLs
      /[A-Z]{20,}/, // Excessive caps
    ];

    const combinedText = `${name} ${email} ${subject} ${message}`;
    if (spamPatterns.some(pattern => pattern.test(combinedText))) {
      // Silently reject spam without telling them
      return NextResponse.json(
        { success: true, message: "Your message has been received." },
        { status: 200 }
      );
    }

    // Send email via Resend
    const resendApiKey = serverEnv.RESEND_API_KEY;
    try {
      if (resendApiKey) {
        const resend = new Resend(resendApiKey);
        await resend.emails.send({
          from: "Waves and Waders Contact Form <onboarding@resend.dev>",
          to: CONTACT_EMAIL,
          replyTo: email.trim(),
          subject: `Contact Form: ${subject.trim()}`,
          html: `
            <h2>New Contact Form Submission</h2>
            <p><strong>From:</strong> ${escapeHtml(name.trim())}</p>
            <p><strong>Email:</strong> ${escapeHtml(email.trim())}</p>
            <p><strong>Subject:</strong> ${escapeHtml(subject.trim())}</p>
            <p><strong>Message:</strong></p>
            <p>${escapeHtml(message.trim()).replace(/\n/g, "<br>")}</p>
            <hr>
            <p style="color: #666; font-size: 12px;">Submitted at: ${new Date().toLocaleString()}</p>
          `,
        });
      }
    } catch (emailError) {
      console.error("Email sending error:", emailError);
      // Continue even if email fails - we'll store in DB as backup
    }

    // Also store in Supabase as backup
    let data: unknown = null;
    const supabaseAdmin = getSupabaseAdminOptional();
    if (supabaseAdmin) {
      const result = await supabaseAdmin
        .from("contact_submissions")
        .insert([
          {
            name: name.trim(),
            email: email.trim().toLowerCase(),
            subject: subject.trim(),
            message: message.trim(),
            created_at: new Date().toISOString(),
          },
        ])
        .select();
      data = result.data;
      if (result.error) {
        console.error("Supabase error:", result.error);
      }
    } else if (!resendApiKey) {
      return NextResponse.json(
        { error: "Contact form is not configured. Please try again later." },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Your message has been received. We'll get back to you soon!",
        data,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Contact form error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again later." },
      { status: 500 }
    );
  }
}
