/**
 * The floating chat widget — a conversational lead form, not a chatbot.
 *
 * It asks a fixed sequence of questions, validates each answer the way the page's own
 * form validates it, and submits the result through `window.__onSendLead` — the exact
 * seam the inline form and the lead modal on / already use. A chat lead and a form lead land
 * in the same place, distinguished only by `form: 'chat'`, which joins the three values
 * that field already carries: 'mid-page', 'end-of-page', 'modal'.
 *
 * ---------------------------------------------------------------------------
 * WHY THE DOM IS BUILT AT RUNTIME AND APPENDED TO <body>
 *
 * Everything inside <x-dc> is React's. The DC runtime re-renders the whole tree on every
 * scroll-threshold crossing, every media-query change and every five-second gallery tick,
 * so markup placed there is reconciled back to the template — which would wipe a message
 * list in the middle of a conversation. `document.body` is outside `#dc-root` and React
 * never touches it, so the transcript survives. Open state still lives in an attribute on
 * <html>, the pattern the mobile menu and the lead modal established here.
 *
 * WHAT THE QUESTIONS ARE
 *
 * Every required field of the site's form is asked, in the form's own order, with the
 * form's own error messages copied verbatim. `business` is optional in the form, so it is
 * optional here and carries a Skip button. The opening question is the one addition: the
 * form has no message field, so `note` was added to the lead payload rather than collect
 * an answer and throw it away.
 * ---------------------------------------------------------------------------
 */

/** The conversation, as data. `check` returns an error string or '' — the strings for
 *  name, phone and email are the page's own, character for character.
 *
 *  Every string here is literal text, never an HTML entity: the transcript is written
 *  with `textContent`, so `&rsquo;` would reach the reader as five characters. The
 *  typographic marks are the real ones the rest of the page uses — U+2019, U+2014. */
export const CHAT_STEPS = [
  {
    key: 'note',
    ask: 'We\u2019re \u014cN Kitchens. Tell us what you cook and how much of it \u2014 we\u2019ll point you at the kitchen that fits.',
    placeholder: 'What you cook, and how much',
  },
  {
    key: 'fullName',
    ask: 'Got it. What\u2019s your full name?',
    placeholder: 'Full name',
  },
  {
    key: 'phone',
    ask: 'And the best number to reach you on?',
    placeholder: 'Phone',
    type: 'tel',
  },
  {
    key: 'email',
    ask: 'Your email?',
    placeholder: 'Email',
    type: 'email',
  },
  {
    key: 'business',
    ask: 'Last one \u2014 your business name, if you have one.',
    placeholder: 'Business name',
    optional: true,
  },
];

export const CHAT_CSS = `
<style>
/* ---- the chat widget ----
   Square panel and bubbles, like everything else on this page; only the two floating
   launchers are round, and they are round because they are a layer over the page rather
   than part of it. Colours, type and spacing are the page's own tokens throughout. */
.on-chat-fab {
  position: fixed; right: 16px; bottom: 96px; z-index: 95;
  width: 54px; height: 54px; padding: 0;
  display: flex; align-items: center; justify-content: center;
  border-radius: 50%;
  background: var(--color-accent-600); color: var(--color-bg);
  border: 1px solid var(--color-accent-600);
  cursor: pointer; box-shadow: var(--shadow-lg);
}
.on-chat-fab:hover { background: var(--color-accent-700); border-color: var(--color-accent-700); }
.on-chat-fab:active { background: var(--color-accent-800); border-color: var(--color-accent-800); }
.on-chat-fab svg { display: block; }
/* A 2 degree nudge every eight seconds, in the page's own .45s ease band. It stops for
   good once the visitor has opened the chat in this session, and both the
   prefers-reduced-motion block below and the accessibility panel's Stop motion setting
   (a universal star rule with animation: none !important) switch it off entirely. */
@keyframes on-chat-nudge {
  0%, 84%, 100% { transform: rotate(0deg); }
  88% { transform: rotate(-7deg); }
  92% { transform: rotate(5deg); }
  96% { transform: rotate(-2deg); }
}
html:not([data-on-chat]):not([data-on-chat-seen]) .on-chat-fab {
  animation: on-chat-nudge 8s ease-in-out 4s infinite;
}
.on-chat-fab .on-chat-close-icon { display: none; }
html[data-on-chat] .on-chat-fab .on-chat-open-icon { display: none; }
html[data-on-chat] .on-chat-fab .on-chat-close-icon { display: block; }

.on-chat-panel { display: none; }
html[data-on-chat] .on-chat-panel {
  display: flex; flex-direction: column;
  position: fixed; right: 16px; bottom: 160px; z-index: 95;
  width: min(360px, calc(100vw - 32px));
  max-height: min(560px, calc(100dvh - 200px));
  background: var(--color-bg); color: var(--color-text);
  border: 1px solid var(--color-divider); box-shadow: var(--shadow-lg);
}
.on-chat-head {
  display: flex; align-items: center; gap: 10px;
  padding: 14px 16px; border-bottom: 1px solid var(--color-divider);
  background: #141414; color: #FAF8F5;
}
.on-chat-head b {
  font-family: var(--font-heading); font-weight: 600; font-size: 16px;
  letter-spacing: 0.06em; text-transform: uppercase; line-height: 1.2;
}
.on-chat-head span {
  display: block; font-size: 13px; line-height: 1.35;
  color: color-mix(in srgb, #FAF8F5 76%, transparent);
}
.on-chat-head > div { margin-right: auto; min-width: 0; }
.on-chat-x {
  width: 40px; height: 40px; flex: none; padding: 0; margin: -8px -8px -8px 0;
  display: flex; align-items: center; justify-content: center;
  background: none; border: 0; cursor: pointer; color: #FAF8F5;
}
.on-chat-x:hover { color: var(--color-accent-400); }

.on-chat-log {
  flex: 1 1 auto; overflow-y: auto; overscroll-behavior: contain;
  padding: 16px; display: flex; flex-direction: column; gap: 10px;
}
.on-chat-msg {
  max-width: 84%; padding: 10px 13px;
  font-size: 15px; line-height: 22px;
}
.on-chat-msg.bot {
  align-self: flex-start;
  background: var(--color-surface); color: var(--color-text);
  border: 1px solid var(--color-divider);
}
/* accent-700, not accent-600: #7A5216 on #FAF8F5 measures 6.5:1 where #96661A is 4.70:1,
   which leaves nothing for a high-contrast display or a poorly calibrated phone. */
.on-chat-msg.you {
  align-self: flex-end;
  background: var(--color-accent-700); color: #FAF8F5;
  border: 1px solid var(--color-accent-700);
}
.on-chat-msg.err { color: var(--color-accent-700); border-color: var(--color-accent-700); }

.on-chat-foot {
  border-top: 1px solid var(--color-divider); padding: 12px;
  display: flex; gap: 8px; align-items: stretch;
}
.on-chat-foot .input {
  flex: 1 1 auto; min-width: 0; min-height: 46px; font-size: 16px;
}
.on-chat-send, .on-chat-skip, .on-chat-done {
  font-family: var(--font-heading); font-weight: 600; font-size: 14px;
  letter-spacing: 0.06em; text-transform: uppercase;
  min-height: 46px; padding: 0 16px; cursor: pointer;
  border: 1px solid var(--color-accent-600);
  background: var(--color-accent-600); color: var(--color-bg);
}
.on-chat-send:hover, .on-chat-done:hover { background: var(--color-accent-700); border-color: var(--color-accent-700); }
.on-chat-skip {
  background: transparent; color: var(--color-text); border-color: var(--color-divider);
}
.on-chat-skip:hover { background: color-mix(in srgb, var(--color-text) 7%, transparent); }
.on-chat-done { width: 100%; }

/* On a phone the panel is a bottom sheet, the same treatment the lead modal gets: the
   360px card would leave slivers of page down both sides and sit on top of the sticky
   CTA at an angle. Full width, on the bottom edge, capped so the page stays visible. */
@media (max-width: 760px) {
  html[data-on-chat] .on-chat-panel {
    left: 0; right: 0; bottom: 0; width: auto;
    max-height: 86dvh;
  }
  html[data-on-chat] body { overflow: hidden; }
  /* The sheet reaches the bottom edge, so the button would float over the transcript
     rather than beside it. The header's x is the close control on a phone. */
  html[data-on-chat] .on-chat-fab { display: none; }
}
@media (prefers-reduced-motion: reduce) {
  .on-chat-fab { animation: none !important; }
}
</style>
`;

/** Everything the widget does, as one delegated IIFE. String.raw because the email test
 *  carries \\s and \\. — a plain template literal would eat both. */
export const CHAT_JS = String.raw`
<script>
(function () {
  var root = document.documentElement;
  var STEPS = __STEPS__;
  var BUSINESS = 'ŌN Kitchens';
  var answers = {};
  var at = 0;
  var done = false;
  var log, input, foot, opener;

  // The page's own validate(), field by field, messages included. Anything that diverges
  // here is a lead the form would have accepted and the chat would not, or the reverse.
  function check(key, v) {
    var s = (v || '').trim();
    if (key === 'note') return s ? '' : 'Tell us a little about what you cook.';
    if (key === 'fullName') return (!s || s.length < 2) ? 'Please enter your full name.' : '';
    if (key === 'phone') {
      if (!s) return 'Please enter a phone number.';
      return s.replace(/[^0-9]/g, '').length < 10 ? 'Please enter a 10-digit phone number.' : '';
    }
    if (key === 'email') {
      if (!s) return 'Please enter your email.';
      return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s) ? '' : 'That email address does not look right.';
    }
    return '';
  }

  function say(text, who) {
    var p = document.createElement('p');
    p.className = 'on-chat-msg ' + who;
    // textContent throughout, never innerHTML: a typed name must not be able to inject
    // markup into a transcript the page then renders.
    p.textContent = text;
    log.appendChild(p);
    log.scrollTop = log.scrollHeight;
    return p;
  }

  function ask() {
    var step = STEPS[at];
    say(step.ask, 'bot');
    input.type = step.type || 'text';
    input.placeholder = step.placeholder;
    input.value = '';
    foot.querySelector('.on-chat-skip').hidden = !step.optional;
    setTimeout(function () { input.focus(); }, 0);
  }

  function finish() {
    done = true;
    var lead = {
      name: (answers.fullName || '').trim(),
      phone: (answers.phone || '').trim(),
      email: (answers.email || '').trim(),
      business: (answers.business || '').trim(),
      note: (answers.note || '').trim(),
      form: 'chat'
    };
    // Same seam, same payload shape, same fire-and-forget transport as both forms. There
    // is no readable response to branch on, so the close below is shown either way —
    // which is also the graceful failure the visitor should get.
    try { window.__onSendLead(lead); } catch (err) { /* never leave the visitor stuck */ }
    var first = lead.name.split(/\s+/)[0] || lead.name;
    say('Thanks, ' + first + ' — request received. One of our team will call you shortly to set a time at Van Nuys or Washington Blvd.', 'bot');
    foot.textContent = '';
    var back = document.createElement('button');
    back.type = 'button';
    back.className = 'on-chat-done';
    back.textContent = 'Back to the page';
    back.addEventListener('click', close);
    foot.appendChild(back);
    setTimeout(function () { back.focus(); }, 0);
  }

  function send(value) {
    if (done) return;
    var step = STEPS[at];
    var v = (value || '').trim();
    if (v) say(v, 'you');
    else if (step.optional) say('Skip', 'you');
    var err = step.optional ? '' : check(step.key, v);
    if (err) { say(err, 'bot err'); input.value = ''; input.focus(); return; }
    answers[step.key] = v;
    at += 1;
    if (at >= STEPS.length) finish(); else ask();
  }

  function open() {
    if (root.hasAttribute('data-on-chat')) return close();
    opener = document.activeElement;
    root.setAttribute('data-on-chat', '');
    root.setAttribute('data-on-chat-seen', '');
    if (!log.children.length) ask();
    else setTimeout(function () { (done ? foot.querySelector('button') : input).focus(); }, 0);
  }

  function close() {
    if (!root.hasAttribute('data-on-chat')) return;
    root.removeAttribute('data-on-chat');
    var fab = document.querySelector('.on-chat-fab');
    if (fab) fab.focus();
    opener = null;
  }

  function build() {
    var wrap = document.createElement('div');

    var fab = document.createElement('button');
    fab.type = 'button';
    fab.className = 'on-chat-fab';
    fab.setAttribute('aria-label', 'Chat with us');
    fab.setAttribute('title', 'Chat with us');
    fab.setAttribute('aria-expanded', 'false');
    fab.setAttribute('aria-controls', 'on-chat-panel');
    fab.innerHTML =
      '<svg class="on-chat-open-icon" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 9.9 9.9 0 0 1-2.6-.3L4 21l1.4-4.1A8.2 8.2 0 0 1 3.6 11.5a8.4 8.4 0 0 1 9-8.4 8.4 8.4 0 0 1 8.4 8.4z"></path></svg>' +
      '<svg class="on-chat-close-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true">' +
      '<path d="M6 6l12 12"></path><path d="M18 6L6 18"></path></svg>';
    fab.addEventListener('click', open);

    var panel = document.createElement('div');
    panel.className = 'on-chat-panel';
    panel.id = 'on-chat-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Chat with ' + BUSINESS);

    var head = document.createElement('div');
    head.className = 'on-chat-head';
    var title = document.createElement('div');
    var b = document.createElement('b');
    b.textContent = BUSINESS;
    var sub = document.createElement('span');
    sub.textContent = 'Tell us what you need. We answer fast.';
    title.appendChild(b);
    title.appendChild(sub);
    var x = document.createElement('button');
    x.type = 'button';
    x.className = 'on-chat-x';
    x.setAttribute('aria-label', 'Close chat');
    x.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12"></path><path d="M18 6L6 18"></path></svg>';
    x.addEventListener('click', close);
    head.appendChild(title);
    head.appendChild(x);

    log = document.createElement('div');
    log.className = 'on-chat-log';
    log.setAttribute('role', 'log');
    log.setAttribute('aria-live', 'polite');

    foot = document.createElement('form');
    foot.className = 'on-chat-foot';
    foot.noValidate = true;
    input = document.createElement('input');
    input.className = 'input';
    input.type = 'text';
    input.autocomplete = 'off';
    input.setAttribute('aria-label', 'Your answer');
    var skip = document.createElement('button');
    skip.type = 'button';
    skip.className = 'on-chat-skip';
    skip.textContent = 'Skip';
    skip.hidden = true;
    skip.addEventListener('click', function () { send(''); });
    var go = document.createElement('button');
    go.type = 'submit';
    go.className = 'on-chat-send';
    go.textContent = 'Send';
    foot.appendChild(input);
    foot.appendChild(skip);
    foot.appendChild(go);
    foot.addEventListener('submit', function (ev) { ev.preventDefault(); send(input.value); });

    panel.appendChild(head);
    panel.appendChild(log);
    panel.appendChild(foot);
    wrap.appendChild(panel);
    wrap.appendChild(fab);
    // body, not <x-dc>: the DC runtime re-renders its whole tree on every scroll
    // threshold, media-query change and five-second gallery tick, which would reconcile
    // this transcript back to nothing.
    document.body.appendChild(wrap);

    var obs = new MutationObserver(function () {
      fab.setAttribute('aria-expanded', root.hasAttribute('data-on-chat') ? 'true' : 'false');
    });
    obs.observe(root, { attributes: true, attributeFilter: ['data-on-chat'] });
  }

  // Escape is claimed twice already on this page — the runtime's window handler closes
  // the accessibility panel and the nav, and the lead modal has its own. stopPropagation
  // keeps one press from closing the chat and something else with it.
  document.addEventListener('keydown', function (ev) {
    if (ev.key !== 'Escape') return;
    if (!root.hasAttribute('data-on-chat')) return;
    ev.stopPropagation();
    close();
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();
})();
</script>
`;
