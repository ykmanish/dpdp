// Demo websites (fictional). They run through the exact same pipeline as live URLs,
// so the demo never depends on network access.
const page = (head, body) => `<!doctype html><html><head><title>Demo</title>${head}</head><body>${body}</body></html>`;

const GA = `<script async src="https://www.googletagmanager.com/gtag/js?id=G-DEMO123"></script><script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','G-DEMO123');</script>`;
const META = `<script>!function(f,b,e,v,n,t,s){n=f.fbq=function(){};t=b.createElement(e);t.src='https://connect.facebook.net/en_US/fbevents.js'}(window,document,'script');fbq('init','000');fbq('track','PageView');</script>`;
const HOTJAR = `<script>(function(h,o,t,j,a,r){h.hj=h.hj||function(){};h._hjSettings={hjid:12345};a=o.getElementsByTagName('head')[0];r=o.createElement('script');r.src='https://static.hotjar.com/c/hotjar-12345.js'})(window,document);</script>`;
const CLARITY = `<script>(function(c,l,a,r,i,t,y){t=l.createElement(r);t.src="https://www.clarity.ms/tag/"+i;})(window,document,"clarity","script","abc");</script>`;
const LINKEDIN = `<script>_linkedin_partner_id="999";</script><script src="https://snap.licdn.com/li.lms-analytics/insight.min.js"></script>`;
const CRITEO = `<script src="https://static.criteo.net/js/ld/publishertag.js"></script>`;
const MOENGAGE = `<script src="https://cdn.moengage.com/webpush/moe_webSdk.min.latest.js"></script>`;
const ONETRUST = `<script src="https://cdn.cookielaw.org/scripttemplates/otSDKStub.js" data-domain-script="demo"></script>`;
const GA_GATED = `<script type="text/plain" class="optanon-category-C0002" src="https://www.googletagmanager.com/gtag/js?id=G-GATED"></script>`;

const FULL_POLICY = `<h1>Privacy Notice</h1>
<p>This notice is issued under the Digital Personal Data Protection Act, 2023 (DPDP Act).</p>
<h2>Personal data we collect</h2><p>We collect your name, email address, mobile number, delivery address and order history.</p>
<h2>Purposes</h2><p>We use your personal data to process orders, provide customer support and, with your consent, send offers. The purpose for which we collect each item is listed below.</p>
<h2>Consent</h2><p>You may withdraw your consent at any time from Account &gt; Privacy, and withdrawing is as easy as giving consent.</p>
<h2>Your rights</h2><p>You have the right to access a summary of the personal data we process, and the right to correction, completion, updating and erasure of your personal data. You may nominate another individual to exercise your rights in the event of death or incapacity.</p>
<h2>Grievance redressal</h2><p>Write to our Data Protection Officer, Priya Menon, at dpo@demo-shop.in. We respond to grievances within 7 days. If unsatisfied, you may complain to the Data Protection Board of India.</p>
<h2>Retention</h2><p>We retain personal data only as long as necessary for the purpose and erase it thereafter.</p>
<h2>Children</h2><p>We obtain verifiable parental consent before processing children's data and do not track minors under 18.</p>
<h2>Security</h2><p>We apply reasonable security safeguards including encryption. In case of a personal data breach we will intimate the Board and affected users.</p>
<h2>Sharing</h2><p>We share data with service providers acting as data processors under contract. Data may be transferred outside India only to countries permitted by the Government.</p>`;

const WEAK_POLICY = `<h1>Privacy Policy</h1>
<p>We value your privacy. We may collect information you provide such as your name and email.</p>
<p>We use cookies to improve your experience. Information may be shared with third parties for marketing.</p>
<p>For questions, contact us at hello@demo-brand.in.</p>`;

const MEDIUM_POLICY = `<h1>Privacy Policy</h1>
<p>Personal data we collect: name, phone number, email, PAN for KYC.</p>
<p>We use your information to provide services and comply with law. Purposes are described in this policy.</p>
<p>You can opt-out of marketing emails at any time. You may request correction of your data.</p>
<p>Grievance Officer: Rahul Shah, grievance@demo-fin.in.</p>
<p>We retain data for 8 years as required by RBI regulations.</p>
<p>We use industry standard security measures. We share data with service providers.</p>
<p>We do not offer erasure of records required for regulatory purposes.</p>`;

export const FIXTURES = {
  greenleaf: {
    html: page(ONETRUST + GA_GATED, `<header><a href="/privacy-policy">Privacy Notice</a></header>
      <div id="onetrust-banner"><p>We use cookies to run this site and, with your permission, for analytics.</p><button>Accept all</button><button>Reject all</button><button>Manage preferences</button></div>
      <form><input type="email" name="email"><label><input type="checkbox"> I agree to the privacy notice</label></form>`),
    policyHtml: page("", FULL_POLICY),
  },
  shopkart: {
    html: page(GA + META + HOTJAR + CRITEO, `<nav><a href="/privacy">Privacy</a></nav><h1>ShopKart Demo — Big Sale</h1>
      <form><input type="text" name="name"><input type="tel" name="mobile"><button>Get OTP</button></form>`),
    policyHtml: page("", WEAK_POLICY),
    cookies: ["_ga", "_fbp", "session_id"],
  },
  paynest: {
    html: page(GA + CLARITY + MOENGAGE + `<script src="https://consent.cookieyes.com/client_data/demo/script.js"></script>`,
      `<div class="cky-consent-bar"><p>This website uses cookies. By continuing you accept cookies.</p><button>Accept</button></div>
       <a href="/privacy-policy">Privacy policy</a><form><input type="email" name="email"><input type="text" name="pan"><small>See our privacy policy</small></form>`),
    policyHtml: page("", MEDIUM_POLICY),
  },
  mediwell: {
    html: page(GA + LINKEDIN, `<h1>MediWell Demo Clinic</h1><form><input name="name"><input name="phone"><input name="dob"><button>Book</button></form>`),
    policyHtml: "",
  },
  edunova: {
    html: page(ONETRUST + GA + `<script src="https://widget.intercom.io/widget/demo"></script>`, `<div id="onetrust-banner"><p>We use cookies.</p><button>Accept all</button><button>Reject all</button></div><a href="/privacy">Privacy &amp; data protection</a>`),
    policyHtml: page("", FULL_POLICY.replace(/<h2>Children<\/h2><p>.*?<\/p>/, "").replace(/nominate[^.]*\./, "")),
  },
  travelyaar: {
    html: page(GA + META + `<script src="https://analytics.tiktok.com/i18n/pixel/events.js"></script>`, `<p>We use cookies. <button>OK</button></p><a href="/privacy-policy">Privacy</a>`),
    policyHtml: page("", WEAK_POLICY + "<p>We retain your data. You can withdraw consent by email. Complaint? Write to us.</p>"),
  },
};
