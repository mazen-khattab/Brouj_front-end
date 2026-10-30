import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Input, Textarea } from '../Fields';

export function ContactSection() {
  const { t } = useTranslation('home');
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');

  return <section aria-labelledby="contact-title" className="home-section pb-8!">
    <div className="grid gap-10 rounded-ui border border-accent/35 bg-primary-deep/80 p-7 sm:p-10 lg:grid-cols-[1fr_1.2fr] lg:gap-20 lg:p-14">
      <div className="flex flex-col items-start justify-between gap-9">
        <div>
          <p className="home-eyebrow">{t('contact.eyebrow')}</p>
          <h2 id="contact-title" className="home-title max-w-[12ch]">{t('contact.title')}</h2>
          <p className="mt-5 max-w-sm leading-8 text-white/75">{t('contact.description')}</p>
        </div>
        <span aria-hidden="true" className="h-px w-20 bg-accent" />
      </div>
      {/* Sending is intentionally deferred until the owner supplies a contact destination. */}
      <form className="grid content-start gap-6" onSubmit={(event) => event.preventDefault()} aria-describedby="contact-availability">
        <Input id="contact-name" name="name" autoComplete="name" label={t('contact.name')} placeholder={t('contact.namePlaceholder')} value={name} onChange={(event) => setName(event.target.value)} />
        <Textarea id="contact-subject" name="subject" rows={4} label={t('contact.subject')} placeholder={t('contact.subjectPlaceholder')} value={subject} onChange={(event) => setSubject(event.target.value)} />
        <div className="flex flex-wrap items-center gap-4">
          <button type="submit" disabled className="inline-flex min-h-12 items-center rounded-ui bg-accent px-6 py-3 font-medium text-primary disabled:cursor-not-allowed disabled:opacity-70">{t('contact.send')}</button>
          <p id="contact-availability" className="max-w-xs text-xs leading-6 text-accent-light">{t('contact.pending')}</p>
        </div>
      </form>
    </div>
  </section>;
}
