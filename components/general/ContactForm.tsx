"use client";

import { useState, FormEvent } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown, Loader2, Send } from "lucide-react";

type FormStatus = "idle" | "submitting" | "success" | "error";

const SUBJECT_OPTIONS = [
  { value: "feedback", label: "General Feedback" },
  { value: "bug", label: "Report a Bug" },
  { value: "feature", label: "Feature Request" },
  { value: "beach", label: "Suggest a Beach" },
  { value: "data", label: "Data Issue" },
  { value: "other", label: "Other" },
] as const;

export default function ContactForm() {
  const [status, setStatus] = useState<FormStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [showCustomSubject, setShowCustomSubject] = useState(false);

  const handleSubjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setSelectedSubject(value);
    setShowCustomSubject(value === "other");
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus("submitting");
    setErrorMessage("");

    const formData = new FormData(e.currentTarget);

    // Use custom subject if "Other" is selected, otherwise use the dropdown value
    const subjectValue = selectedSubject === "other"
      ? formData.get("customSubject")
      : SUBJECT_OPTIONS.find(opt => opt.value === selectedSubject)?.label;

    const data = {
      name: formData.get("name"),
      email: formData.get("email"),
      subject: subjectValue,
      message: formData.get("message"),
    };

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to send message");
      }

      setStatus("success");
      (e.target as HTMLFormElement).reset();
    } catch (error) {
      setStatus("error");
      setErrorMessage(
        error instanceof Error ? error.message : "Something went wrong. Please try again."
      );
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <label
            htmlFor="name"
            className="block text-sm font-medium text-foreground"
          >
            Name
          </label>
          <input
            type="text"
            id="name"
            name="name"
            required
            disabled={status === "submitting"}
            className="w-full rounded-lg border border-border/50 bg-background/50 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-border focus:outline-hidden focus:ring-2 focus:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="Your name"
          />
        </div>

        <div className="space-y-2">
          <label
            htmlFor="email"
            className="block text-sm font-medium text-foreground"
          >
            Email
          </label>
          <input
            type="email"
            id="email"
            name="email"
            required
            disabled={status === "submitting"}
            className="w-full rounded-lg border border-border/50 bg-background/50 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-border focus:outline-hidden focus:ring-2 focus:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="your.email@example.com"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label
          htmlFor="subject"
          className="block text-sm font-medium text-foreground"
        >
          Subject
        </label>
        <div className="relative">
          <select
            id="subject"
            name="subject"
            value={selectedSubject}
            onChange={handleSubjectChange}
            required
            disabled={status === "submitting"}
            className={cn(
              "w-full appearance-none rounded-lg border border-border/50 bg-background/50 pl-4 pr-11 py-2.5 text-sm text-foreground shadow-xs",
              "focus:border-border focus:outline-hidden focus:ring-2 focus:ring-ring/50",
              "disabled:cursor-not-allowed disabled:opacity-50"
            )}
          >
            <option value="" className="bg-background text-foreground">
              Select a topic...
            </option>
            {SUBJECT_OPTIONS.map((option) => (
              <option
                key={option.value}
                value={option.value}
                className="bg-background text-foreground"
              >
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown
            className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/60"
            aria-hidden="true"
          />
        </div>
      </div>

      {showCustomSubject && (
        <div className="space-y-2">
          <label
            htmlFor="customSubject"
            className="block text-sm font-medium text-foreground"
          >
            Custom Subject
          </label>
          <input
            type="text"
            id="customSubject"
            name="customSubject"
            required
            disabled={status === "submitting"}
            className="w-full rounded-lg border border-border/50 bg-background/50 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-border focus:outline-hidden focus:ring-2 focus:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="What's this about?"
          />
        </div>
      )}

      <div className="space-y-2">
        <label
          htmlFor="message"
          className="block text-sm font-medium text-foreground"
        >
          Message
        </label>
        <textarea
          id="message"
          name="message"
          required
          rows={6}
          disabled={status === "submitting"}
          className="w-full rounded-lg border border-border/50 bg-background/50 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-border focus:outline-hidden focus:ring-2 focus:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
          placeholder="Tell us what's on your mind..."
        />
      </div>

      {status === "error" && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">
          {errorMessage}
        </div>
      )}

      {status === "success" && (
        <div className="rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-600 dark:text-green-400">
          Thank you! Your message has been sent successfully. We&apos;ll get back to you soon.
        </div>
      )}

      <button
        type="submit"
        disabled={status === "submitting"}
        className={cn(
          "w-full rounded-full bg-foreground px-6 py-3 text-sm font-medium text-background shadow-sm transition hover:opacity-95 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50",
          status === "submitting" && "cursor-wait"
        )}
      >
        {status === "submitting" ? (
          <span className="inline-flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Sending...
          </span>
        ) : (
          <span className="inline-flex items-center justify-center gap-2">
            <Send className="h-4 w-4" aria-hidden="true" />
            Send message
          </span>
        )}
      </button>
    </form>
  );
}
