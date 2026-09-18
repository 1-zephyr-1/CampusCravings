"use client";

import { useState } from "react";
import { Send, Loader2 } from "lucide-react";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";

const TOPIC_OPTIONS = [
  { value: "general", label: "General question" },
  { value: "bug", label: "Bug or technical issue" },
  { value: "account", label: "Account & verification" },
  { value: "seller", label: "Becoming a seller" },
  { value: "order", label: "Order problem" },
  { value: "press", label: "Press / partnership" },
];

const TO_EMAIL = "hello@campuscravings.bracu";

/**
 * Contact form. Uses a mailto: fallback as the backend \u2014 we build a
 * pre-filled message and hand off to the user's email client. No third-party
 * contact service is wired up yet.
 */
export function ContactForm() {
  const [topic, setTopic] = useState("general");
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);

    const subject = `[${topic}] CampusCravings contact from ${name || "anonymous"}`;
    const body = [
      `From: ${name || "(not provided)"} <${email || "(not provided)"}>`,
      `Topic: ${topic}`,
      "",
      message || "(no message)",
    ].join("\n");

    const mailto = `mailto:${TO_EMAIL}?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(body)}`;

    // Slight delay so the loading state is visible before the handoff.
    window.setTimeout(() => {
      window.location.href = mailto;
      setSubmitting(false);
    }, 250);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Your name" htmlFor="contact-name">
          <Input
            id="contact-name"
            name="name"
            type="text"
            autoComplete="name"
            placeholder="e.g. Tahmid Khan"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        <Field label="Your BRACU email" htmlFor="contact-email">
          <Input
            id="contact-email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@g.bracu.ac.bd"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </Field>
      </div>

      <Field label="What\u2019s this about?" htmlFor="contact-topic">
        <Select
          id="contact-topic"
          name="topic"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
        >
          {TOPIC_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Message" htmlFor="contact-message">
        <Textarea
          id="contact-message"
          name="message"
          rows={6}
          placeholder="Tell us what\u2019s on your mind. Screenshots and order numbers help."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required
        />
      </Field>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <p className="text-xs text-[var(--text-subtle)]">
          Submitting opens your email app with the message pre-filled.
        </p>
        <button
          type="submit"
          disabled={submitting}
          aria-busy={submitting || undefined}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--primary)] text-white text-sm font-semibold rounded-full hover:bg-[var(--primary-hover)] transition-colors disabled:opacity-70 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] focus-visible:ring-[var(--primary)]/40"
        >
          {submitting ? (
            <>
              <Loader2 size={14} aria-hidden="true" className="animate-spin motion-reduce:animate-none" />
              <span>Opening email&hellip;</span>
            </>
          ) : (
            <>
              <Send size={14} aria-hidden="true" />
              Send message
            </>
          )}
        </button>
      </div>
    </form>
  );
}
