import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import './LandingPage.css';

export default function LandingPage() {
  useEffect(() => {

      const reduce = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      /* ---------- nav: stuck state + drawer + active link ---------- */
      const nav = document.getElementById('nav');
      const burger = document.getElementById('burger');
      const drawer = document.getElementById('drawer');

      const onScroll = function () { nav.classList.toggle('stuck', window.scrollY > 8); };
      onScroll();
      window.addEventListener('scroll', onScroll, { passive: true });

      function closeDrawer() {
        nav.classList.remove('open');
        drawer.classList.remove('show');
        burger.setAttribute('aria-expanded', 'false');
        burger.setAttribute('aria-label', 'Open menu');
      }
      const onBurgerClick = function () {
        const open = !drawer.classList.contains('show');
        nav.classList.toggle('open', open);
        drawer.classList.toggle('show', open);
        burger.setAttribute('aria-expanded', String(open));
        burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      };
      burger.addEventListener('click', onBurgerClick);
      const onDrawerClick = function (e) { if (e.target.closest('a')) closeDrawer(); };
      drawer.addEventListener('click', onDrawerClick);
      const onKeyDown = function (e) { if (e.key === 'Escape') closeDrawer(); };
      document.addEventListener('keydown', onKeyDown);

      const links = Array.prototype.slice.call(document.querySelectorAll('.navlinks a'));
      const targets = links.map(function (a) { return document.querySelector(a.getAttribute('href')); });
      let navObs = null;
      if ('IntersectionObserver' in window) {
        navObs = new IntersectionObserver(function (entries) {
          entries.forEach(function (en) {
            if (!en.isIntersecting) return;
            const i = targets.indexOf(en.target);
            links.forEach(function (l, j) {
              if (j === i) l.setAttribute('aria-current', 'true'); else l.removeAttribute('aria-current');
            });
          });
        }, { rootMargin: '-45% 0px -50% 0px' });
        targets.forEach(function (t) { if (t) navObs.observe(t); });
      }

      /* ---------- scroll reveal + one-shot section animations ---------- */
      const revealed = new WeakSet();
      function activate(el) {
        if (revealed.has(el)) return;
        revealed.add(el);
        el.classList.add('in');
        el.querySelectorAll('.bar i[data-w]').forEach(function (b) { b.style.width = b.getAttribute('data-w') + '%'; });
        if (el.id === 'heroPanel') runHeroRing();
        el.querySelectorAll('.num[data-count]').forEach(runCount);
        if (el.classList.contains('stats')) el.querySelectorAll('.num[data-count]').forEach(runCount);
      }

      let obs = null;
      if ('IntersectionObserver' in window && !reduce) {
        obs = new IntersectionObserver(function (entries) {
          entries.forEach(function (en) { if (en.isIntersecting) { activate(en.target); obs.unobserve(en.target); } });
        }, { threshold: 0.16, rootMargin: '0px 0px -8% 0px' });
        document.querySelectorAll('.landing-page .rv, .landing-page .path, .landing-page #heroPanel, .landing-page .stats').forEach(function (el) { obs.observe(el); });
      } else {
        document.querySelectorAll('.landing-page .rv, .landing-page .path, .landing-page #heroPanel, .landing-page .stats').forEach(activate);
      }

      /* ---------- counters ---------- */
      function runCount(el) {
        if (el.dataset.done) return;
        el.dataset.done = '1';
        const end = parseFloat(el.getAttribute('data-count'));
        const dec = parseInt(el.getAttribute('data-dec') || '0', 10);
        const unit = el.querySelector('i') ? el.querySelector('i').outerHTML : '';
        if (reduce) { el.innerHTML = fmt(end, dec) + unit; return; }
        let t0 = null; const dur = 1300;
        function frame(t) {
          if (t0 === null) t0 = t;
          const p = Math.min((t - t0) / dur, 1);
          const e = 1 - Math.pow(1 - p, 4);
          el.innerHTML = fmt(end * e, dec) + unit;
          if (p < 1) requestAnimationFrame(frame);
        }
        requestAnimationFrame(frame);
      }
      function fmt(v, dec) {
        return dec ? v.toFixed(dec) : Math.round(v).toLocaleString('en-US');
      }

      /* ---------- hero ring ---------- */
      function runHeroRing() {
        const ring = document.getElementById('heroRing');
        const pct = document.getElementById('heroPct');
        if (!ring || ring.dataset.done) return;
        ring.dataset.done = '1';
        const C = 2 * Math.PI * 45, target = 72;
        ring.style.strokeDashoffset = String(C - C * target / 100);
        if (reduce) { pct.textContent = target + '%'; return; }
        let t0 = null;
        function f(t) {
          if (t0 === null) t0 = t;
          const p = Math.min((t - t0) / 1500, 1);
          const e = 1 - Math.pow(1 - p, 4);
          pct.textContent = Math.round(target * e) + '%';
          if (p < 1) requestAnimationFrame(f);
        }
        setTimeout(function () { requestAnimationFrame(f); }, 250);
      }

      /* ---------- AI matching engine (concept demo) ---------- */
      const ROLES = [
        {
          name: 'Junior Web Developer',
          ctx: 'Cebu IT Park · entry level · hybrid',
          cur: [['HTML', 92, 'hi'], ['CSS', 74, ''], ['JavaScript', 38, 'lo'], ['Git', 30, 'lo']],
          gaps: ['JavaScript fundamentals', 'Git & GitHub', 'React', 'API integration'],
          plan: ['JavaScript Fundamentals', 'Git & GitHub', 'React', 'REST APIs', 'Portfolio project'],
          match: 62
        },
        {
          name: 'Junior Data Analyst',
          ctx: 'Cebu Business Park · entry level · on-site',
          cur: [['SQL', 92, 'hi'], ['Spreadsheets', 88, 'hi'], ['Python', 45, ''], ['Power BI', 20, 'lo']],
          gaps: ['Python for data', 'Data visualisation', 'Power BI'],
          plan: ['Power BI Fundamentals', 'Python for Data Analysis', 'Data Visualisation', 'Dashboard project'],
          match: 72
        },
        {
          name: 'CX / Non-Voice Support',
          ctx: 'Mandaue · entry level · shifting schedule',
          cur: [['Written English', 84, 'hi'], ['Ticketing tools', 52, ''], ['Process docs', 40, 'lo'], ['Data entry QA', 66, '']],
          gaps: ['CRM / ticketing systems', 'Case documentation', 'Basic data QA'],
          plan: ['Ticketing Systems Basics', 'Case Documentation', 'Data Quality Assurance', 'Live simulation'],
          match: 68
        }
      ];
      const aiRole = document.getElementById('aiRole'), aiCtx = document.getElementById('aiCtx'),
        aiCur = document.getElementById('aiCur'), aiGaps = document.getElementById('aiGaps'),
        aiPlan = document.getElementById('aiPlan'), aiRing = document.getElementById('aiRing'),
        aiPct = document.getElementById('aiPct');
      const AC = 2 * Math.PI * 38;

      function levelWord(v) { return v >= 80 ? 'Advanced' : v >= 55 ? 'Intermediate' : v >= 35 ? 'Beginner' : 'Not started'; }

      function paint(idx) {
        const r = ROLES[idx];
        aiRole.textContent = r.name;
        aiCtx.textContent = r.ctx;

        aiCur.innerHTML = r.cur.map(function (s) {
          return '<div class="lvl"><span>' + s[0] + '</span>' +
            '<span class="lvl__t"><i class="' + s[2] + '"></i></span>' +
            '<span class="lvl__p">' + levelWord(s[1]) + '</span></div>';
        }).join('');
        requestAnimationFrame(function () {
          aiCur.querySelectorAll('.lvl__t i').forEach(function (bar, i) { bar.style.width = r.cur[i][1] + '%'; });
        });

        aiGaps.innerHTML = r.gaps.map(function (g) { return '<span class="chip">' + g + '</span>'; }).join('');
        aiPlan.innerHTML = r.plan.map(function (p) { return '<li>' + p + '</li>'; }).join('');

        aiRing.style.strokeDashoffset = String(AC - AC * r.match / 100);
        const from = parseInt(aiPct.textContent, 10) || 0, to = r.match;
        if (reduce) { aiPct.textContent = to + '%'; return; }
        let t0 = null;
        function f(t) {
          if (t0 === null) t0 = t;
          const p = Math.min((t - t0) / 700, 1), e = 1 - Math.pow(1 - p, 4);
          aiPct.textContent = Math.round(from + (to - from) * e) + '%';
          if (p < 1) requestAnimationFrame(f);
        }
        requestAnimationFrame(f);
      }
      const roleButtons = Array.prototype.slice.call(document.querySelectorAll('.landing-page .rolebtn'));
      const roleHandlers = roleButtons.map(function (btn) {
        const handler = function () {
          roleButtons.forEach(function (b) { b.setAttribute('aria-pressed', 'false'); });
          btn.setAttribute('aria-pressed', 'true');
          paint(parseInt(btn.getAttribute('data-role'), 10));
        };
        btn.addEventListener('click', handler);
        return { btn, handler };
      });
      paint(0);

      /* ---------- Job Match Score simulator ---------- */
      const BANDS = [
        { lo: 85, name: 'Highly Qualified', msg: 'You cover this role\u2019s core requirements. Apply, and use the remaining items to negotiate.' },
        { lo: 65, name: 'Qualified', msg: 'You\u2019ve built a strong foundation. Close three skills and you move into the top band for this role.' },
        { lo: 45, name: 'Developing', msg: 'The foundation is there. Two or three targeted courses will move you up a band.' },
        { lo: 25, name: 'Early Stage', msg: 'Start with the fundamentals, in the order the pathway gives you. Progress here is fast.' },
        { lo: 0, name: 'Not Yet Ready', msg: 'This role is a stretch right now. We\u2019d suggest a closer starting role and a route back to this one.' }
      ];
      const gR = document.getElementById('gRange'), gV = document.getElementById('gVal'),
        gB = document.getElementById('gBand'), gN = document.getElementById('gNext'),
        gM = document.getElementById('gMsg'), gBars = document.getElementById('gBars').children,
        bandLis = document.getElementById('bandList').children;

      function paintScore(v) {
        const b = BANDS.find(function (x) { return v >= x.lo; });
        gV.innerHTML = v + '<sup>%</sup>';
        gB.textContent = b.name;
        gM.textContent = b.msg;
        const idx = BANDS.indexOf(b);
        gN.textContent = idx === 0 ? 'top band reached' : 'next band at ' + BANDS[idx - 1].lo + '%';
        const filled = 5 - idx;
        for (let i = 0; i < 5; i++) {
          gBars[i].classList.toggle('on', i < filled);
          gBars[i].classList.toggle('top', i === 4 && filled === 5);
        }
        for (let j = 0; j < bandLis.length; j++) {
          bandLis[j].classList.toggle('act', parseInt(bandLis[j].getAttribute('data-lo'), 10) === b.lo);
        }
      }
      const onRangeInput = function () { paintScore(parseInt(gR.value, 10)); };
      gR.addEventListener('input', onRangeInput);
      paintScore(72);

      /* ---------- employer: skill-based vs resume filter ---------- */
      const mode = document.getElementById('skillMode'),
        modeLabel = document.getElementById('skillModeLabel'),
        note = document.getElementById('empNote'),
        cands = document.querySelectorAll('.landing-page #candList .cand');

      function paintEmp() {
        const skillView = mode.checked;
        modeLabel.textContent = skillView ? 'Skill-based view' : 'R\u00e9sum\u00e9 filter view';
        cands.forEach(function (c) {
          const passes = c.getAttribute('data-degree') === '1' && c.getAttribute('data-yrs') !== '0';
          c.classList.toggle('hidden', !skillView && !passes);
        });
        note.innerHTML = skillView
          ? '<b>Skill-based view.</b> Ranked by verified capability against the four skills you specified. Experience and schooling are context, not a filter.'
          : '<b>R\u00e9sum\u00e9 filter view: degree plus one year required.</b> Two candidates disappear, including the self-taught developer with three of your four skills verified. This is how good people get filtered out before anyone reads them.';
      }
      mode.addEventListener('change', paintEmp);
      paintEmp();

      return function cleanup() {
        window.removeEventListener('scroll', onScroll);
        document.removeEventListener('keydown', onKeyDown);
        burger.removeEventListener('click', onBurgerClick);
        drawer.removeEventListener('click', onDrawerClick);
        gR.removeEventListener('input', onRangeInput);
        mode.removeEventListener('change', paintEmp);
        roleHandlers.forEach(function ({ btn, handler }) { btn.removeEventListener('click', handler); });
        if (obs) obs.disconnect();
        if (navObs) navObs.disconnect();
      };

  }, []);

  return (
    <div className="landing-page">
<header className="nav" id="nav">
    <div className="shell nav__in">
      <a className="brand" href="#top" aria-label="Cebu Upskilling, home">
        <img className="brand__logo" src={"/images/CropLogo-removebg-preview.png"} alt="Cebu Upskilling" />
        <span className="brand__wm"><b>Cebu Upskilling</b></span>
      </a>

      <nav className="navlinks" aria-label="Main">
        <a href="#product">Product</a>
        <a href="#pathway">How It Works</a>
        <a href="#employers">For Employers</a>
        <a href="#providers">For Training Providers</a>
        <a href="#about">About</a>
        <a href="#pilot">Pilot</a>
      </nav>

      <div className="nav__cta">
        <Link className="btn btn--ghost btn--sm" to="/login">Sign in</Link>
        <Link className="btn btn--primary btn--sm" to="/register">Get started</Link>
        <button className="burger" id="burger" aria-label="Open menu" aria-expanded="false" aria-controls="drawer">
          <span></span><span></span><span></span>
        </button>
      </div>
    </div>

    <div className="drawer" id="drawer">
      <ul>
        <li><a href="#product">Product <i>01</i></a></li>
        <li><a href="#pathway">How It Works <i>02</i></a></li>
        <li><a href="#ai">AI Career Matching <i>03</i></a></li>
        <li><a href="#employers">For Employers <i>04</i></a></li>
        <li><a href="#providers">For Training Providers <i>05</i></a></li>
        <li><a href="#pilot">Development &amp; Validation Pilot <i>06</i></a></li>
        <li><a href="#about">About &amp; Team <i>07</i></a></li>
      </ul>
    </div>
  </header>

  <main id="top">

    
    <section className="hero">
      <div className="hero__bg" aria-hidden="true">
        <svg viewBox="0 0 900 760" fill="none">
          <defs>
            <pattern id="dots" width="26" height="26" patternUnits="userSpaceOnUse">
              <circle cx="1.2" cy="1.2" r="1.2" fill="oklch(88% 0.012 258)" />
            </pattern>
          </defs>
          <rect width="900" height="760" fill="url(#dots)" />
          <path d="M60 700 L340 700 L620 380 L900 380" stroke="oklch(92% 0.014 258)" strokeWidth="1.5" />
          <path d="M60 620 L420 620 L700 300 L900 300" stroke="oklch(93.5% 0.012 258)" strokeWidth="1.5" />
        </svg>
      </div>

      <div className="shell hero__grid">
        <div>
          
          <h1 className="h-hero rv" style={{'--i': '1'}}>Your next opportunity starts with knowing <em>what to learn</em>.</h1>
          <p className="lede rv" style={{'--i': '2'}}>Cebu Upskilling connects your skills, learning, credentials and job
            opportunities into one clear career pathway. Pick the job you want. See exactly what you're missing. Close
            the gap.</p>
          <div className="hero__cta rv" style={{'--i': '3'}}>
            <a className="btn btn--primary" href="#pilot">Join the Pilot <svg className="btn__arrow" width="15" height="15"
                viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"
                strokeLinejoin="round">
                <path d="M5 12h13M13 6l6 6-6 6" />
              </svg></a>
            <a className="btn btn--ghost" href="#pathway">See how it works</a>
          </div>
          <div className="hero__meta rv" style={{'--i': '4'}}>
            <div><b>2nd Place</b><span>Cebu SolutionsFest 2026, an open-innovation challenge convened by CCCI</span>
            </div>
            <div><b>Status</b><span>Prototype built. Now entering a development &amp; validation pilot.</span></div>
          </div>
        </div>

        
        <div className="panel rv" style={{'--i': '2'}} id="heroPanel" role="img"
          aria-label="Product concept: target role Junior Data Analyst with a 72 percent job match, skill levels for SQL, Excel, Python and Power BI, three skill gaps, and a recommended next step.">
          <div className="panel__bar">
            <span className="lamp"><i></i><i></i><i></i></span>
            <h4>My Pathway</h4>
            <span className="live"><i></i>Concept preview</span>
          </div>
          <div className="panel__body">
            <div className="dash__top">
              <div className="dash__role">
                <span className="eyebrow">Target role</span>
                <strong>Junior Data Analyst</strong>
                <span>Cebu IT Park · entry level · on-site or hybrid</span>
              </div>
              <div className="ring">
                <svg viewBox="0 0 104 104" aria-hidden="true">
                  <circle className="trk" cx="52" cy="52" r="45" />
                  <circle className="val" id="heroRing" cx="52" cy="52" r="45" />
                </svg>
                <span className="ring__label"><b id="heroPct">0%</b><span>Job match</span></span>
              </div>
            </div>

            <div style={{marginTop: '18px'}}>
              <span className="eyebrow" style={{display: 'block', marginBottom: '4px'}}>Your skills against this role</span>
              <div className="skillrow">
                <span className="skillrow__name"><span className="check" aria-hidden="true">✓</span>SQL</span>
                <span className="skillrow__pct">Advanced</span>
                <span className="bar"><i className="ok" data-w="92" style={{'--d': '0ms'}}></i></span>
              </div>
              <div className="skillrow">
                <span className="skillrow__name"><span className="check" aria-hidden="true">✓</span>Spreadsheets / Excel</span>
                <span className="skillrow__pct">Advanced</span>
                <span className="bar"><i className="ok" data-w="88" style={{'--d': '110ms'}}></i></span>
              </div>
              <div className="skillrow">
                <span className="skillrow__name">Python</span>
                <span className="skillrow__pct">Beginner · 45%</span>
                <span className="bar"><i className="mid" data-w="45" style={{'--d': '220ms'}}></i></span>
              </div>
              <div className="skillrow">
                <span className="skillrow__name">Power BI</span>
                <span className="skillrow__pct">Not started · 20%</span>
                <span className="bar"><i className="low" data-w="20" style={{'--d': '330ms'}}></i></span>
              </div>
            </div>

            <div className="gapstrip">
              <span className="eyebrow">Skill gaps holding you back</span>
              <div className="chips">
                <span className="chip">Python for data</span>
                <span className="chip">Data visualisation</span>
                <span className="chip">Power BI</span>
                <span className="chip chip--n">+ 2 nice-to-have</span>
              </div>
            </div>

            <div className="next">
              <span className="next__i" aria-hidden="true">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"
                  strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h13M13 6l6 6-6 6" />
                </svg>
              </span>
              <span><b>Next recommended step</b><span>Power BI Fundamentals · 3 weeks · free provider
                  listing</span></span>
            </div>
          </div>
        </div>
      </div>
    </section>

    
    <section className="proof band--tight" id="proof">
      <div className="shell proof__grid">
        <div>
          <div className="award rv">
            <span className="award__badge" aria-hidden="true">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
                strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 21h8M12 17v4M17 4h3v3a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V4h3" />
                <path d="M7 4h10v4a5 5 0 0 1-10 0V4Z" />
              </svg>
            </span>
            <span><b>2nd Place · Cebu SolutionsFest 2026</b><span>Finals at CIT-U · 17 June 2026</span></span>
          </div>
          <h2 className="h-sec rv" style={{'--i': '1'}}>Built in Cebu. Recognised for solving a real workforce problem.</h2>
          <p className="lede rv" style={{'--i': '2'}}>Cebu SolutionsFest 2026 was an open-innovation challenge built around problem
            briefs from Cebu City departments. Twelve finalist teams pitched across an Open and a Student track. Cebu
            Upskilling was recognised for bridging education and employment by aligning skills with industry needs.</p>
          <div className="orgs rv" style={{'--i': '3'}}>
            <span className="eyebrow">Convened by</span>
            <ul>
              <li>Cebu Chamber of Commerce &amp; Industry</li>
              <li>City Government of Cebu</li>
              <li>Province of Cebu</li>
              <li>The Sandbox Foundation</li>
              <li>Hosted at Cebu Institute of Technology – University</li>
            </ul>
            <p className="tiny" style={{marginTop: '14px'}}>Listed as event organisers and hosts. Cebu Upskilling has no
              funding, endorsement, or commercial partnership with any of them.</p>
          </div>
        </div>

        <figure className="photo rv" style={{'--i': '2', margin: '0'}}>
          
          <img src={"/images/TeamMembers.jpg"}
            alt="The four-person Cebu Upskilling team standing together at the CBM 2026 Technology and Innovation Forum in Cebu City." />
          <div className="photo__ph" style={{display: 'none'}}>
            <span className="eyebrow" style={{color: 'oklch(72% .09 48)'}}>Event photograph</span>
            <p style={{fontSize: '.9375rem', maxWidth: '34ch', marginInline: 'auto'}}>Team Fear No Hardship at the CBM 2026
              Technology &amp; Innovation Forum.</p>
            <code>assets/team-cbm-2026.jpg</code>
          </div>
          <figcaption className="photo__cap">
            <b>CBM 2026 Technology &amp; Innovation Forum</b>
            Waterfront Cebu City Hotel &amp; Casino. The forum, themed “Future Ready Philippines: Navigating AI,
            Industry Disruption, and the Skills Revolution,” is where the SolutionsFest winning entries were showcased.
          </figcaption>
        </figure>
      </div>
    </section>

    
    <section className="band" id="problem">
      <div className="shell">
        <div className="prob__head">
          <div>
            <span className="eyebrow rv">01 · The problem</span>
            <h2 className="h-sec rv" style={{'--i': '1', marginTop: '18px'}}>The problem isn't always finding a job.<br />Sometimes it's
              knowing what you're missing.</h2>
          </div>
          <p className="lede rv" style={{'--i': '2'}}>Universities teach the foundation. The labour market moves faster than any
            curriculum. So people are told to “upskill,” take general courses, earn general certificates, and still get
            the same reply.</p>
        </div>

        <div className="stats rv" style={{'--i': '1'}}>
          <div className="stat">
            <b className="num" data-count="3.8" data-dec="1">0<i>%</i></b>
            <p>Central Visayas unemployment rate in 2025, up from 3.1% in 2024. PSA-7 cited skills mismatch and recent
              disasters as primary drivers.</p>
            <span className="src">Source · PSA-7 Annual Labor Force Survey, released 21 May 2026</span>
          </div>
          <div className="stat">
            <b className="num" data-count="115000" data-suffix="">0</b>
            <p>People in the region counted as unemployed, up from about 94,000 a year earlier.</p>
            <span className="src">Source · PSA-7, 2025 annual estimates</span>
          </div>
          <div className="stat">
            <b className="num" data-count="88.3" data-dec="1">0<i>%</i></b>
            <p>Youth employment rate for ages 15 to 24 in Central Visayas, the group most likely to be told they “lack
              required skills and experience.”</p>
            <span className="src">Source · PSA-7 regional data, 2025</span>
          </div>
          <div className="stat">
            <b className="num" data-count="5.3" data-dec="1">0<i>%</i></b>
            <p>Lapu-Lapu City recorded the highest localised unemployment rate in the region, a reminder that the gap is
              not evenly distributed.</p>
            <span className="src">Source · PSA-7 regional data, 2025</span>
          </div>
        </div>

        <div className="qwrap">
          <div className="qsay rv">
            <p>“You lack the required skills and experience.”</p>
            <span>The reply that ends most applications</span>
          </div>
          <ol className="qlist">
            <li className="rv"><span className="qn">Q1</span><span><span className="qt">Which skills does this role actually
                  require?</span><span className="qa">Job posts list titles and years, rarely a competency
                  breakdown.</span></span></li>
            <li className="rv" style={{'--i': '1'}}><span className="qn">Q2</span><span><span className="qt">Which of those do I already
                  have?</span><span className="qa">Self-assessment is guesswork with no shared reference.</span></span></li>
            <li className="rv" style={{'--i': '2'}}><span className="qn">Q3</span><span><span className="qt">What should I learn next, and
                  in what order?</span><span className="qa">Thousands of courses, no sequence tied to a real
                  job.</span></span></li>
            <li className="rv" style={{'--i': '3'}}><span className="qn">Q4</span><span><span className="qt">Which credential is worth the
                  time and money?</span><span className="qa">Certificates accumulate without mapping to local
                  demand.</span></span></li>
            <li className="rv" style={{'--i': '4'}}><span className="qn">Q5</span><span><span className="qt">How close am I to being
                  ready?</span><span className="qa">No signal until a rejection email arrives.</span></span></li>
            <li className="rv" style={{'--i': '5'}}><span className="qn">Q6</span><span><span className="qt">Where do I actually
                  apply?</span><span className="qa">SMEs hiring for exactly these skills stay invisible behind big-brand
                  listings.</span></span></li>
          </ol>
        </div>

        <p className="lede rv" style={{marginTop: 'clamp(36px,4vw,56px)', maxWidth: '78ch', color: 'var(--ink-2)', fontWeight: '500'}}>
          Employers have the same problem from the other side: they cannot see who genuinely matches. Training providers
          cannot see what employers currently need. Government cannot see the regional gap in enough detail to act on
          it. Four groups reaching for each other in the dark.
        </p>
      </div>
    </section>

    
    <section className="band band--tight" style={{background: 'var(--paper-2)', borderBlock: '1px solid var(--line)'}} id="gap">
      <div className="shell">
        <span className="eyebrow rv">02 · The gap</span>
        <h2 className="h-sec rv" style={{'--i': '1', marginTop: '18px', maxWidth: '24ch'}}>Job platforms and learning platforms both stop
          short.</h2>
        <div className="cmp">
          <div className="cmp__col rv">
            <span className="eyebrow">Job platforms</span>
            <h3>LinkedIn, JobStreet, Indeed</h3>
            <p className="says">“Here are 100&nbsp;jobs.”</p>
            <ul>
              <li><em>—</em>Assumes you already qualify</li>
              <li><em>—</em>No view of your skill gaps</li>
              <li><em>—</em>No route from rejection to readiness</li>
            </ul>
          </div>
          <div className="cmp__col rv" style={{'--i': '1'}}>
            <span className="eyebrow">Learning platforms</span>
            <h3>Coursera, e-TESDA, providers</h3>
            <p className="says">“Here are 5,000&nbsp;courses.”</p>
            <ul>
              <li><em>—</em>Generic skills, not a specific role</li>
              <li><em>—</em>No sequence, no priority</li>
              <li><em>—</em>Credential earned, employer still unconvinced</li>
            </ul>
          </div>
          <div className="cmp__col cmp__col--us rv" style={{'--i': '2'}}>
            <span className="eyebrow">Cebu Upskilling</span>
            <h3>One connected pathway</h3>
            <p className="says">“Here is the path from where you are to the job you want.”</p>
            <ul>
              <li><em>→</em>Required skills for a real, open role</li>
              <li><em>→</em>Your gaps, ranked by what matters most</li>
              <li><em>→</em>Courses and credentials in order</li>
              <li><em>→</em>Readiness you can see before you apply</li>
            </ul>
          </div>
        </div>
        <p className="tiny rv" style={{marginTop: '20px', maxWidth: '76ch'}}>We don't build the courses. TESDA, universities and
          training providers already do that well. What's missing is the connection between them and the job that
          actually wants you. That's the part we're building.</p>
      </div>
    </section>

    
    <section className="band" id="pathway">
      <div className="shell">
        <span className="eyebrow rv">03 · The solution</span>
        <h2 className="h-sec rv" style={{'--i': '1', marginTop: '18px'}}>One pathway from skills to opportunity.</h2>
        <p className="lede rv" style={{'--i': '2', marginTop: '20px'}}>Five connected steps. Each one produces the input for the next,
          so nothing is guesswork.</p>

        <div className="path rv">
          <div className="path__track">
            <div className="path__line" aria-hidden="true"><i></i></div>
            <div className="step" style={{'--i': '0'}}>
              <div className="step__n"><svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="9" />
                  <circle cx="12" cy="12" r="4" />
                  <path d="M12 3v3M12 18v3M3 12h3M18 12h3" />
                </svg></div>
              <h4>Assess</h4>
              <p>Choose a target role, then take a structured assessment of what you can actually do today.</p>
            </div>
            <div className="step" style={{'--i': '1'}}>
              <div className="step__n"><svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 19V9M10 19V5M16 19v-7M22 19h-20" />
                </svg></div>
              <h4>Understand</h4>
              <p>See the role's required skills next to yours, and the gaps ranked by how much they matter.</p>
            </div>
            <div className="step" style={{'--i': '2'}}>
              <div className="step__n"><svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 5h16M4 12h10M4 19h6" />
                  <path d="M17 15l3 3 3-4" transform="translate(-3 1)" />
                </svg></div>
              <h4>Learn</h4>
              <p>Follow an ordered pathway of courses from providers who already teach the missing skills.</p>
            </div>
            <div className="step" style={{'--i': '3'}}>
              <div className="step__n"><svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="9" r="5" />
                  <path d="M8.5 13.5L7 21l5-2.5L17 21l-1.5-7.5" />
                </svg></div>
              <h4>Build credentials</h4>
              <p>Assessments and completions stack into a skill record an employer can actually read.</p>
            </div>
            <div className="step" style={{'--i': '4'}}>
              <div className="step__n"><svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 12h6l2 5 3-10 2 5h5" />
                </svg></div>
              <h4>Get matched</h4>
              <p>Surface roles, including SME roles, where your current capability genuinely lines up.</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    
    <section className="band band--tight" id="product">
      <div className="shell">
        <span className="eyebrow rv">04 · Product</span>
        <h2 className="h-sec rv" style={{'--i': '1', marginTop: '18px', maxWidth: '26ch'}}>Seven pieces, built to work as one system.
        </h2>
        <div className="caplegend rv" style={{'--i': '2'}}>
          <span className="tag tag--proto"><i className="dot"></i>In prototype</span>
          <span className="tag tag--dev"><i className="dot"></i>In development</span>
          <span className="tag tag--road"><i className="dot"></i>Roadmap</span>
        </div>

        <div className="caps">
          <div className="cap rv">
            <span className="cap__n">01</span>
            <h4>Career Goal</h4>
            <p>Name the role, and where possible the employer. Everything downstream is scoped to that target instead of
              to a generic skill category.</p>
            <span className="tag tag--proto"><i className="dot"></i>In prototype</span>
          </div>
          <div className="cap rv">
            <span className="cap__n">02</span>
            <h4>Skill Assessment</h4>
            <p>Structured levels from no knowledge to advanced, verified by assessment rather than self-declaration on a
              résumé.</p>
            <span className="tag tag--proto"><i className="dot"></i>In prototype</span>
          </div>
          <div className="cap rv">
            <span className="cap__n">03</span>
            <h4>Skill Gap Analysis</h4>
            <p>The difference between what the role requires and what you can demonstrate, ordered by impact on your
              readiness.</p>
            <span className="tag tag--proto"><i className="dot"></i>In prototype</span>
          </div>
          <div className="cap rv">
            <span className="cap__n">04</span>
            <h4>Personalised Learning Path</h4>
            <p>A sequence, not a catalogue. Built from courses that already exist across TESDA, universities, and
              private providers.</p>
            <span className="tag tag--dev"><i className="dot"></i>In development</span>
          </div>
          <div className="cap rv">
            <span className="cap__n">05</span>
            <h4>Credentials &amp; Skill Record</h4>
            <p>A long-term record of verified growth that replaces informal guesswork for both the learner and the
              employer.</p>
            <span className="tag tag--dev"><i className="dot"></i>In development</span>
          </div>
          <div className="cap rv">
            <span className="cap__n">06</span>
            <h4>Job Matching</h4>
            <p>Opportunities filtered by skills, salary, schedule and experience, with SMEs visible alongside large
              employers.</p>
            <span className="tag tag--dev"><i className="dot"></i>In development</span>
          </div>
          <div className="cap rv">
            <span className="cap__n">07</span>
            <h4>Workforce Insights</h4>
            <p>Aggregated, anonymised skill-demand signals that could help providers and workforce agencies see the
              regional gap.</p>
            <span className="tag tag--road"><i className="dot"></i>Roadmap</span>
          </div>
        </div>

        <p className="tiny rv" style={{marginTop: '20px', maxWidth: '74ch'}}>Status labels reflect where each piece stands today,
          not where we want it to be. Nothing above is presented as deployed at scale.</p>
      </div>
    </section>

    
    <section className="band dark" id="ai">
      <div className="shell">
        <span className="eyebrow rv">05 · AI career matching</span>
        <h2 className="h-sec rv" style={{'--i': '1', marginTop: '18px', maxWidth: '22ch'}}>Stop guessing what to learn next.</h2>

        <div className="ai__grid">
          <div>
            <p className="lede lede-d rv" style={{'--i': '2'}}>A matching engine has one job here: compare four things that today
              live in four different places, then return a single ordered plan. Pick a target role and watch the pathway
              change.</p>

            <div className="roles rv" style={{'--i': '3'}} role="group" aria-label="Choose a target role">
              <button className="rolebtn" data-role="0" aria-pressed="true">Junior Web Developer</button>
              <button className="rolebtn" data-role="1" aria-pressed="false">Junior Data Analyst</button>
              <button className="rolebtn" data-role="2" aria-pressed="false">CX / Non-Voice Support</button>
            </div>

            <ul className="aiflow rv" style={{'--i': '4'}}>
              <li><b>Input</b><span>Target role, assessed skills, experience, education, credentials, schedule,
                  location.</span></li>
              <li><b>Compare</b><span>Employer skill requirements, your demonstrated level, courses available from real
                  providers.</span></li>
              <li><b>Output</b><span>Ranked gaps, an ordered learning path, a readiness score, and the roles worth
                  applying to.</span></li>
            </ul>

            <p className="disc rv" style={{'--i': '5'}}>The matching logic in the prototype is rule-based. The AI engine described
              here is the intended direction, not a shipped feature. We would rather be boring and honest about that
              than call it AI-powered today.</p>
          </div>

          <div className="panel panel--dark rv" style={{'--i': '2'}}>
            <div className="panel__bar">
              <span className="lamp"><i></i><i></i><i></i></span>
              <h4>Matching engine · concept</h4>
              <span className="live"><i></i>Interactive</span>
            </div>
            <div className="aip">
              <div className="aip__row">
                <h5>Target</h5>
                <strong id="aiRole"
                  style={{fontSize: '1.19rem', fontWeight: '700', letterSpacing: '-.022em', display: 'block'}}>Junior Web
                  Developer</strong>
                <span className="tiny" id="aiCtx" style={{color: 'var(--d-muted)'}}>Cebu IT Park · entry level · hybrid</span>
              </div>
              <div className="aip__row">
                <h5>Current capability</h5>
                <div id="aiCur"></div>
              </div>
              <div className="aip__row">
                <h5>Missing</h5>
                <div className="chips" id="aiGaps"></div>
              </div>
              <div className="aip__row aip__out">
                <div>
                  <h5>Recommended path</h5>
                  <ol className="plan" id="aiPlan"></ol>
                </div>
                <div className="miniring">
                  <svg width="88" height="88" viewBox="0 0 88 88" aria-hidden="true">
                    <circle className="trk" cx="44" cy="44" r="38" />
                    <circle className="val" id="aiRing" cx="44" cy="44" r="38" />
                  </svg>
                  <span className="miniring__l"><b id="aiPct">62%</b><span>Job match</span></span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    
    <section className="band" id="score">
      <div className="shell">
        <span className="eyebrow rv">06 · Job Match Score</span>
        <h2 className="h-sec rv" style={{'--i': '1', margin: '18px 0 20px', maxWidth: '26ch'}}>A readiness signal, not an exam grade.</h2>
        <p className="lede rv" style={{'--i': '2', marginBottom: 'clamp(32px,4vw,52px)'}}>One number from 0 to 100 for how closely
          your current capability aligns with a specific role's requirements. It's designed to tell you what to do next,
          not to rank you against other people.</p>

        <div className="score__grid">
          <div className="panel gauge rv">
            <div className="gauge__val">
              <b className="num" id="gVal">72<sup>%</sup></b>
              <span className="gauge__band"><strong id="gBand">Qualified</strong><span id="gNext">next band at
                  85%</span></span>
            </div>
            <div className="scale">
              <div className="scale__bars" id="gBars"><i></i><i></i><i></i><i></i><i></i></div>
              <div className="scale__lab">
                <span>0–24</span><span>25–44</span><span>45–64</span><span>65–84</span><span>85–100</span>
              </div>
            </div>
            <label className="tiny" htmlFor="gRange" style={{display: 'block', marginTop: '20px'}}>Drag to see how the score reads at
              different levels of readiness</label>
            <input type="range" id="gRange" min="0" max="100" defaultValue="72" step="1"
              aria-label="Job Match Score simulator" />
            <p className="gauge__msg" id="gMsg">You've built a strong foundation. Close three skills and you move into the
              top band for this role.</p>
          </div>

          <div>
            <ul className="bandlist" id="bandList">
              <li data-lo="85"><span className="r">85–100</span><span><span className="n">Highly Qualified</span><span
                    className="tiny">Apply now. Your capability covers the role's core requirements.</span></span></li>
              <li data-lo="65"><span className="r">65–84</span><span><span className="n">Qualified</span><span
                    className="tiny">Worth applying while you close the remaining gaps.</span></span></li>
              <li data-lo="45"><span className="r">45–64</span><span><span className="n">Developing</span><span
                    className="tiny">Foundation is there. Two or three targeted courses will move you up.</span></span></li>
              <li data-lo="25"><span className="r">25–44</span><span><span className="n">Early Stage</span><span
                    className="tiny">Start with the fundamentals in the recommended order.</span></span></li>
              <li data-lo="0"><span className="r">0–24</span><span><span className="n">Not Yet Ready</span><span className="tiny">A
                    different starting role may get you there faster. We'll suggest one.</span></span></li>
            </ul>
            <p className="tiny rv" style={{marginTop: '20px', maxWidth: '60ch'}}>The Job Match Score is Cebu Upskilling's own
              product framework and prototype methodology. It is not an officially validated labour-market standard, and
              we don't present it as one. Validating whether the bands actually predict readiness is a core goal of the
              pilot.</p>
          </div>
        </div>
      </div>
    </section>

    
    <section className="band band--tight" style={{background: 'var(--paper-2)', borderBlock: '1px solid var(--line)'}} id="seekers">
      <div className="shell two">
        <div>
          <span className="eyebrow rv">07 · For job seekers</span>
          <h2 className="h-sec rv" style={{'--i': '1', marginTop: '18px'}}>Know where you stand.</h2>
          <p className="lede rv" style={{'--i': '2', marginTop: '18px'}}>Students, fresh graduates, career changers, freelancers,
            people picking up a side hustle, and anyone who has been told to upskill without being told what to learn.
            The core platform is designed to stay free for the people who need it most.</p>
          <ul className="benefits">
            <li className="rv"><span className="bi" aria-hidden="true"><svg width="14" height="14" viewBox="0 0 24 24"
                  fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                  <circle cx="11" cy="11" r="7" />
                  <path d="M20 20l-4-4" />
                </svg></span><span><b>See your gaps in plain language</b><span>Not a score with no explanation. The
                  specific skills, and why each one matters for this role.</span></span></li>
            <li className="rv" style={{'--i': '1'}}><span className="bi" aria-hidden="true"><svg width="14" height="14"
                  viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                  <path d="M4 6h16M4 12h11M4 18h7" />
                </svg></span><span><b>Get a plan with an order to it</b><span>First this, then that. Built from courses
                  that already exist, including free public ones.</span></span></li>
            <li className="rv" style={{'--i': '2'}}><span className="bi" aria-hidden="true"><svg width="14" height="14"
                  viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"
                  strokeLinejoin="round">
                  <path d="M3 17l5-5 4 3 8-9" />
                </svg></span><span><b>Track progress you can point at</b><span>A skill record that grows over time,
                  instead of a folder of unrelated certificates.</span></span></li>
            <li className="rv" style={{'--i': '3'}}><span className="bi" aria-hidden="true"><svg width="14" height="14"
                  viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"
                  strokeLinejoin="round">
                  <path d="M12 3l2.4 5.3 5.6.6-4.2 3.9 1.2 5.7L12 15.7 6.9 18.5 8.1 12.8 4 8.9l5.6-.6z" />
                </svg></span><span><b>Find work that fits your actual life</b><span>Filter by skills, salary, schedule
                  and experience. Part-time and side-hustle roles included.</span></span></li>
          </ul>
          <p className="rv"
            style={{'--i': '4', marginTop: '26px', fontSize: '1.0625rem', fontWeight: '600', letterSpacing: '-.016em', maxWidth: '40ch'}}>
            Opportunity shouldn't belong only to people who already have the perfect résumé.</p>
        </div>

        <div className="two__media rv" style={{'--i': '1'}}>
          <div className="panel">
            <div className="panel__bar"><span className="lamp"><i></i><i></i><i></i></span>
              <h4>Opportunities · filtered by capability</h4>
            </div>
            <div className="panel__body">
              <div className="emp__req" style={{marginTop: '0'}}>
                <span className="req">skills: React, JS</span><span className="req">schedule: hybrid</span><span
                  className="req">exp: 0–1 yr</span><span className="req">SME ok</span>
              </div>
              <div className="cands" style={{marginTop: '18px'}}>
                <div className="cand">
                  <span className="cand__av" aria-hidden="true">SD</span>
                  <span><b>Frontend Developer (React)</b><span>Serbisyo Digital · Cebu · hybrid ·
                      ₱45,000/mo</span></span>
                  <span className="cand__m"><b>96%</b><span>match</span></span>
                </div>
                <div className="cand">
                  <span className="cand__av" aria-hidden="true">MA</span>
                  <span><b>Landing page build (project)</b><span>Mango Apps · SME · remote · project rate</span></span>
                  <span className="cand__m"><b>91%</b><span>match</span></span>
                </div>
                <div className="cand">
                  <span className="cand__av" aria-hidden="true">LT</span>
                  <span><b>Junior Web Developer</b><span>Local studio · Mandaue · on-site · ₱28,000/mo</span></span>
                  <span className="cand__m"><b>84%</b><span>match</span></span>
                </div>
              </div>
              <p className="empnote"><b>Two of these three are SMEs.</b> On a conventional job board they'd sit below the
                big-brand listings. Ranked by capability match, they surface first.</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    
    <section className="band" id="employers">
      <div className="shell two two--flip">
        <div className="two__media rv">
          <div className="panel">
            <div className="panel__bar">
              <span className="lamp"><i></i><i></i><i></i></span>
              <h4>Employer view · open role</h4>
              <span className="live"><i></i>Interactive</span>
            </div>
            <div className="panel__body">
              <div className="emp__head">
                <div>
                  <span className="eyebrow" style={{display: 'block', marginBottom: '5px'}}>Open role</span>
                  <strong style={{fontSize: '1.19rem', fontWeight: '700', letterSpacing: '-.02em', display: 'block'}}>Junior Web
                    Developer</strong>
                  <div className="emp__req">
                    <span className="req">React</span><span className="req">JavaScript</span><span className="req">Git</span><span
                      className="req">REST API</span>
                  </div>
                </div>
              </div>
              <label className="toggle" style={{marginTop: '20px'}}>
                <input type="checkbox" id="skillMode" defaultChecked />
                <span className="tr" aria-hidden="true"></span>
                <span id="skillModeLabel">Skill-based view</span>
              </label>
              <div className="cands" id="candList">
                <div className="cand" data-degree="1" data-yrs="1">
                  <span className="cand__av" aria-hidden="true">A</span>
                  <span><b>Candidate A</b><span>Verified: React, JS, Git, REST · 1 yr freelance</span></span>
                  <span className="cand__m"><b>94%</b><span>match</span></span>
                </div>
                <div className="cand" data-degree="0" data-yrs="0">
                  <span className="cand__av" aria-hidden="true">B</span>
                  <span><b>Candidate B</b><span>Verified: React, JS, Git · self-taught, no degree</span></span>
                  <span className="cand__m"><b>87%</b><span>match</span></span>
                </div>
                <div className="cand" data-degree="1" data-yrs="0">
                  <span className="cand__av" aria-hidden="true">C</span>
                  <span><b>Candidate C</b><span>Verified: JS, Git, REST · fresh graduate, 0 yrs</span></span>
                  <span className="cand__m"><b>81%</b><span>match</span></span>
                </div>
              </div>
              <p className="empnote" id="empNote"><b>Skill-based view.</b> Ranked by verified capability against the four
                skills you specified. Experience and schooling are context, not a filter.</p>
            </div>
          </div>
        </div>

        <div>
          <span className="eyebrow rv">08 · For employers</span>
          <h2 className="h-sec rv" style={{'--i': '1', marginTop: '18px'}}>Find people by what they can do.</h2>
          <p className="lede rv" style={{'--i': '2', marginTop: '18px'}}>Specify the skills, levels, experience and schedule the role
            genuinely needs. Get candidates whose verified capability lines up, instead of a stack of résumés you have
            to decode. Flip the toggle to see what a conventional degree-and-years filter removes.</p>
          <ul className="benefits">
            <li className="rv"><span className="bi" aria-hidden="true"><svg width="14" height="14" viewBox="0 0 24 24"
                  fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 20V10M10 20V4M16 20v-6" />
                </svg></span><span><b>Define the role in skills and levels</b><span>The same structure the learner side
                  is assessed against, so both sides mean the same thing.</span></span></li>
            <li className="rv" style={{'--i': '1'}}><span className="bi" aria-hidden="true"><svg width="14" height="14"
                  viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"
                  strokeLinejoin="round">
                  <path d="M9 12l2.5 2.5L17 9" />
                  <circle cx="12" cy="12" r="9" />
                </svg></span><span><b>Signal demand upstream</b><span>What you post becomes the target learners train
                  toward, before they apply.</span></span></li>
            <li className="rv" style={{'--i': '2'}}><span className="bi" aria-hidden="true"><svg width="14" height="14"
                  viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"
                  strokeLinejoin="round">
                  <path d="M3 21V8l6-4 6 4v13M9 21v-5h3v5" />
                  <path d="M15 12h6v9h-6" />
                </svg></span><span><b>Built so SMEs are visible</b><span>A small business posting four required skills
                  competes on fit, not on brand recognition or ad budget.</span></span></li>
          </ul>
        </div>
      </div>
    </section>

    
    <section className="band band--tight" style={{background: 'var(--paper-2)', borderBlock: '1px solid var(--line)'}}
      id="providers">
      <div className="shell">
        <span className="eyebrow rv">09 · For training providers</span>
        <h2 className="h-sec rv" style={{'--i': '1', margin: '18px 0 20px', maxWidth: '24ch'}}>Teach the skills employers actually need.
        </h2>
        <p className="lede rv" style={{'--i': '2'}}>We don't build courses and we don't compete with the people who do. TESDA,
          universities, technical schools and private providers already have the content. What they often lack is a live
          view of which skills local employers are asking for right now.</p>

        <div className="model" style={{marginTop: 'clamp(30px,3.6vw,48px)'}}>
          <div className="mrow rv"><span className="k">A</span>
            <h4>List your programmes where the demand is</h4>
            <p>Courses appear inside a learner's pathway at the exact point their gap analysis calls for that skill.</p>
          </div>
          <div className="mrow rv"><span className="k">B</span>
            <h4>Reach learners with intent</h4>
            <p>Not browsers. People who have already identified the gap your course closes and know why they're taking
              it.</p>
          </div>
          <div className="mrow rv"><span className="k">C</span>
            <h4>See aggregated skill demand</h4>
            <p>Which skills are being requested by employers and missed by learners, in your region. Roadmap feature.
            </p>
          </div>
          <div className="mrow rv"><span className="k">D</span>
            <h4>Align to industry requirements</h4>
            <p>Adjust or add offerings against real posted requirements rather than a curriculum review cycle.</p>
          </div>
        </div>
      </div>
    </section>

    
    <section className="band" id="ecosystem">
      <div className="shell">
        <span className="eyebrow rv">10 · The workforce ecosystem</span>
        <h2 className="h-sec rv" style={{'--i': '1', marginTop: '18px', maxWidth: '26ch'}}>Four groups. One shared source of truth about
          skills.</h2>

        <div className="eco">
          <div className="rv">
            <svg className="ecosvg" viewBox="0 0 560 420" role="img"
              aria-label="Diagram: learners, employers, training providers and government organisations all connect through Cebu Upskilling, exchanging skills data and feedback.">
              <defs>
                <marker id="ar" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto">
                  <path d="M0 0 L10 5 L0 10 z" fill="oklch(66% 0.05 258)" />
                </marker>
              </defs>
              <g stroke="oklch(84% 0.012 258)" strokeWidth="1.6" fill="none">
                <path className="flow" d="M150 88 L246 176" markerEnd="url(#ar)" />
                <path className="flow" d="M410 88 L314 176" markerEnd="url(#ar)" style={{animationDelay: '.8s'}} />
                <path className="flow" d="M150 332 L246 244" markerEnd="url(#ar)" style={{animationDelay: '1.6s'}} />
                <path className="flow" d="M410 332 L314 244" markerEnd="url(#ar)" style={{animationDelay: '2.4s'}} />
                <path className="flow" d="M246 194 L150 106" markerEnd="url(#ar)" style={{animationDelay: '2s'}} />
                <path className="flow" d="M314 194 L410 106" markerEnd="url(#ar)" style={{animationDelay: '1.2s'}} />
                <path className="flow" d="M246 226 L150 314" markerEnd="url(#ar)" style={{animationDelay: '.4s'}} />
                <path className="flow" d="M314 226 L410 314" markerEnd="url(#ar)" style={{animationDelay: '2.8s'}} />
              </g>

              
              <rect x="216" y="180" width="128" height="60" rx="13" fill="oklch(21% 0.035 258)" />
              <text x="280" y="205" textAnchor="middle" fill="oklch(97% 0.006 258)"
                fontFamily="Schibsted Grotesk,sans-serif" fontSize="14.5" fontWeight="700" letterSpacing="-.3">Cebu
                Upskilling</text>
              <text x="280" y="223" textAnchor="middle" fill="oklch(76% 0.08 48)" fontFamily="DM Mono,monospace"
                fontSize="8.5" letterSpacing="1.6">SKILLS LAYER</text>

              <g fontFamily="Schibsted Grotesk,sans-serif">
                <rect x="34" y="46" width="196" height="60" rx="12" fill="#fff" stroke="oklch(88% 0.012 258)"
                  strokeWidth="1.4" />
                <text x="52" y="72" fill="oklch(21% .035 258)" fontSize="14" fontWeight="650">Learners &amp; job
                  seekers</text>
                <text x="52" y="90" fill="oklch(51% .019 258)" fontSize="11">gaps · learning · credentials</text>

                <rect x="330" y="46" width="196" height="60" rx="12" fill="#fff" stroke="oklch(88% 0.012 258)"
                  strokeWidth="1.4" />
                <text x="348" y="72" fill="oklch(21% .035 258)" fontSize="14" fontWeight="650">Employers &amp;
                  SMEs</text>
                <text x="348" y="90" fill="oklch(51% .019 258)" fontSize="11">requirements · matched candidates</text>

                <rect x="34" y="314" width="196" height="60" rx="12" fill="#fff" stroke="oklch(88% 0.012 258)"
                  strokeWidth="1.4" />
                <text x="52" y="340" fill="oklch(21% .035 258)" fontSize="14" fontWeight="650">Training
                  providers</text>
                <text x="52" y="358" fill="oklch(51% .019 258)" fontSize="11">courses · skill demand signals</text>

                <rect x="330" y="314" width="196" height="60" rx="12" fill="#fff" stroke="oklch(88% 0.012 258)"
                  strokeWidth="1.4" />
                <text x="348" y="340" fill="oklch(21% .035 258)" fontSize="14" fontWeight="650">Workforce
                  agencies</text>
                <text x="348" y="358" fill="oklch(51% .019 258)" fontSize="11">regional gap · programme design</text>
              </g>
            </svg>
          </div>

          <ul className="ecolist">
            <li className="rv"><span className="k">01</span><span><b>Learners give the demand side something to
                  read</b><span>Verified skill levels replace self-declared résumé claims.</span></span></li>
            <li className="rv" style={{'--i': '1'}}><span className="k">02</span><span><b>Employers give the learning side a
                  target</b><span>Posted requirements become the specification a pathway is built against.</span></span>
            </li>
            <li className="rv" style={{'--i': '2'}}><span className="k">03</span><span><b>Providers close the loop</b><span>Courses
                  fill the gaps that keep appearing, and see which ones those are.</span></span></li>
            <li className="rv" style={{'--i': '3'}}><span className="k">04</span><span><b>Agencies see the pattern</b><span>Aggregated,
                  anonymised regional skill gaps to inform programmes and funding. Roadmap.</span></span></li>
          </ul>
        </div>
      </div>
    </section>

    
    <section className="band dark" id="impact">
      <div className="shell">
        <span className="eyebrow rv">11 · Expected impact</span>
        <h2 className="h-sec rv" style={{'--i': '1', margin: '18px 0 16px', maxWidth: '24ch'}}>What we're setting out to change.</h2>
        <p className="lede lede-d rv" style={{'--i': '2'}}>These are the outcomes the platform is designed to produce. We're not
          attaching numbers to them yet, because we haven't earned them yet.</p>

        <div className="impact">
          <div className="imp rv"><span className="k">01</span>
            <h4>Reduced skill mismatch</h4>
            <p>Job seekers reach the exact courses a target role requires before they apply, rather than after a
              rejection. The gap closes on the supply side instead of being absorbed as unemployment.</p>
          </div>
          <div className="imp rv" style={{'--i': '1'}}><span className="k">02</span>
            <h4>SME visibility</h4>
            <p>Skill-based filtering gives small and medium employers an accessible hiring pipeline that doesn't depend
              on brand recognition.</p>
          </div>
          <div className="imp rv" style={{'--i': '2'}}><span className="k">03</span>
            <h4>More credentials attained</h4>
            <p>A clear reason to finish a course, because each one is tied to a named role and a visible readiness
              score.</p>
          </div>
          <div className="imp rv" style={{'--i': '3'}}><span className="k">04</span>
            <h4>Clearer career pathways</h4>
            <p>People move from “I should upskill” to a specific, ordered next step they can start this week.</p>
          </div>
          <div className="imp rv" style={{'--i': '4'}}><span className="k">05</span>
            <h4>Training aligned to industry</h4>
            <p>Providers and academe can respond to current demand instead of a lagging curriculum cycle.</p>
          </div>
        </div>
      </div>
    </section>

    
    <section className="band" id="pilot">
      <div className="shell">
        <span className="eyebrow rv">12 · Development &amp; validation pilot</span>
        <h2 className="h-sec rv" style={{'--i': '1', margin: '18px 0 20px', maxWidth: '28ch'}}>We're building this with the people it's
          meant to serve.</h2>
        <p className="lede rv" style={{'--i': '2'}}>A prototype that wins a pitch is not a product. The next phase is deliberately
          unglamorous: put it in front of real learners, real employers and real providers, and find out which parts are
          wrong.</p>

        <div className="pilot__loop rv" style={{'--i': '3'}}>
          <span className="loopstep"><b>01</b>Discover</span><span className="loopjoin" aria-hidden="true">→</span>
          <span className="loopstep"><b>02</b>Build</span><span className="loopjoin" aria-hidden="true">→</span>
          <span className="loopstep"><b>03</b>Test</span><span className="loopjoin" aria-hidden="true">→</span>
          <span className="loopstep"><b>04</b>Validate</span><span className="loopjoin" aria-hidden="true">→</span>
          <span className="loopstep"><b>05</b>Improve</span><span className="loopjoin" aria-hidden="true">→</span>
          <span className="loopstep"><b>06</b>Scale</span>
        </div>

        <div className="val">
          <div>
            <h3 className="h-sub rv">What the pilot has to prove</h3>
            <ul className="vlist" style={{marginTop: '18px'}}>
              <li className="rv"><span className="bx" aria-hidden="true"></span><span>Whether people can accurately identify and
                  report their own skills</span></li>
              <li className="rv"><span className="bx" aria-hidden="true"></span><span>Whether the skill-gap output is genuinely
                  useful, not just plausible</span></li>
              <li className="rv"><span className="bx" aria-hidden="true"></span><span>Whether recommended learning pathways make
                  sense to the person following them</span></li>
              <li className="rv"><span className="bx" aria-hidden="true"></span><span>Whether the Job Match Score is understood,
                  and whether it tracks real readiness</span></li>
              <li className="rv"><span className="bx" aria-hidden="true"></span><span>Whether employers find skill-based
                  matching better than what they do today</span></li>
              <li className="rv"><span className="bx" aria-hidden="true"></span><span>Whether SMEs can actually operate the
                  platform with the time they have</span></li>
              <li className="rv"><span className="bx" aria-hidden="true"></span><span>Whether training providers can contribute
                  courses that fit the gaps we surface</span></li>
            </ul>
            <p className="tiny rv" style={{marginTop: '20px', maxWidth: '62ch'}}>No pilot results are published on this page
              because there aren't any yet. When there are, they'll appear here with their methodology and sample size.
            </p>
          </div>

          <div className="joinbox rv" style={{'--i': '1'}}>
            <h4>Join the pilot</h4>
            <p>We're looking for a small, honest first cohort. If any of these describe you, we want to hear from you.
            </p>
            <div className="who">
              <span>Learners &amp; job seekers</span><span>Employers</span><span>SMEs</span>
              <span>Training providers</span><span>Schools</span><span>Workforce organisations</span>
            </div>
            <div style={{display: 'flex', flexWrap: 'wrap', gap: '12px'}}>
              <a className="btn btn--signal" href="mailto:hello@cebuupskilling.ph?subject=Pilot%20interest">Join the Pilot
                <svg className="btn__arrow" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h13M13 6l6 6-6 6" />
                </svg></a>
              <a className="btn btn--ghostDark" href="mailto:hello@cebuupskilling.ph?subject=Partnership">Partner with
                us</a>
            </div>
            <p className="tiny" style={{marginTop: '18px', color: 'oklch(62% .02 258)'}}>Replace the address above with your real
              contact route before publishing.</p>
          </div>
        </div>
      </div>
    </section>

    
    <section className="band band--tight" style={{background: 'var(--paper-2)', borderBlock: '1px solid var(--line)'}} id="model">
      <div className="shell">
        <span className="eyebrow rv">13 · Business model</span>
        <h2 className="h-sec rv" style={{'--i': '1', margin: '18px 0 16px', maxWidth: '24ch'}}>How this is designed to sustain itself.
        </h2>
        <p className="lede rv" style={{'--i': '2'}}>Potential revenue streams, not current revenue. The core learner experience is
          designed to stay free, because the people who need it most are the least able to pay for it.</p>
        <div className="model">
          <div className="mrow rv"><span className="k">01</span>
            <h4>Employer subscriptions</h4>
            <p>Advanced recruitment tools, priority matching and candidate recommendations for companies hiring at
              volume.</p>
          </div>
          <div className="mrow rv"><span className="k">02</span>
            <h4>Course provider listings</h4>
            <p>Providers promote programmes inside the pathways where their courses close a real gap.</p>
          </div>
          <div className="mrow rv"><span className="k">03</span>
            <h4>Government partnerships</h4>
            <p>Workforce development programmes supported by aggregated regional skill-gap insight.</p>
          </div>
          <div className="mrow rv"><span className="k">04</span>
            <h4>Premium learner features</h4>
            <p>Optional. Deeper career insight, personalised recommendations and practice assessments.</p>
          </div>
        </div>
      </div>
    </section>

    
    <section className="band" id="about">
      <div className="shell">
        <div className="prob__head">
          <div>
            <span className="eyebrow rv">14 · Our story</span>
            <h2 className="h-sec rv" style={{'--i': '1', marginTop: '18px', maxWidth: '24ch'}}>It started with a rejection letter
              everyone recognises.</h2>
          </div>
          <p className="lede rv" style={{'--i': '2'}}>A student-led project at Don Bosco Technical College – Cebu, built around a
            problem we'd watched up close: people are told to upskill, without being told what to learn, why, what job
            it leads to, or whether they're actually ready. Cebu Upskilling exists to connect those missing pieces.</p>
        </div>

        <div className="tl">
          <div className="tl__line" aria-hidden="true"></div>
          <div className="tlx rv"><b>Academic innovation</b><span>Don Bosco Technical College – Cebu</span></div>
          <div className="tlx rv" style={{'--i': '1'}}><b>SolutionsFest recognition</b><span>2nd Place · June 2026</span></div>
          <div className="tlx rv now" style={{'--i': '2'}}><b>Development</b><span>Prototype → product · now</span></div>
          <div className="tlx rv" style={{'--i': '3'}}><b>Validation pilot</b><span>Next</span></div>
          <div className="tlx rv" style={{'--i': '4'}}><b>Startup</b><span>Cebu → Central Visayas → PH</span></div>
        </div>

        <div style={{marginTop: 'clamp(48px,6vw,80px)'}}>
          <span className="eyebrow rv">The team</span>
          <h3 className="h-sub rv" style={{'--i': '1', marginTop: '14px'}}>Team Fear No Hardship</h3>
          <div className="team">
            <div className="mate rv"><img className="mate__photo" src={"/images/MEMBERS/Cabaluna.jpg"}
                alt="John Paolo Cabaluna" /><b>John Paolo
                Cabaluna</b><span>Co-founder</span></div>
            <div className="mate rv" style={{'--i': '1'}}><img className="mate__photo"
                src={"/images/MEMBERS/2%20BSIT%20-%20Evangelista,%20Jess%20Matthew%20B..JPG"} alt="Jess Matthew Evangelista" /><b>Jess Matthew
                Evangelista</b><span>Co-founder</span></div>
            <div className="mate rv" style={{'--i': '2'}}><img className="mate__photo"
                src={"/images/MEMBERS/2%20BSIT%20-%20Sucgang,%20Jake%20Fiel.JPG"} alt="Jake Sucgang" /><b>Jake
                Sucgang</b><span>Co-founder</span></div>
            <div className="mate rv" style={{'--i': '3'}}><img className="mate__photo" src={"/images/MEMBERS/santos.jpg"}
                alt="Carl Joshua Santos" /><b>Carl Joshua
                Santos</b><span>Co-founder</span></div>
          </div>
          <p className="tiny rv" style={{marginTop: '16px', maxWidth: '60ch'}}>Neutral titles used deliberately. We'll add specific
            roles when they're real rather than assigned for a website.</p>
        </div>
      </div>
    </section>

    
    <section className="dark cta">
      <div className="shell">
        <h2 className="rv">Know your next step.</h2>
        <p className="rv" style={{'--i': '1'}}>Whether you're building your career, hiring talent, or preparing people for work,
          Cebu Upskilling is building a clearer path from skills to opportunity. Start in Cebu. Built to travel.</p>
        <div className="cta__btns rv" style={{'--i': '2'}}>
          <a className="btn btn--onDark" href="mailto:hello@cebuupskilling.ph?subject=Pilot%20interest">Join the Pilot <svg
              className="btn__arrow" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h13M13 6l6 6-6 6" />
            </svg></a>
          <a className="btn btn--ghostDark" href="mailto:hello@cebuupskilling.ph?subject=Partnership">Partner with us</a>
        </div>
      </div>
    </section>

  </main>

  
  <footer>
    <div className="shell">
      <div className="foot">
        <div className="foot__brand">
          <a className="brand" href="#top" aria-label="Cebu Upskilling, back to top">
            <img className="brand__logo" src={"/images/CropLogo-removebg-preview.png"} alt="Cebu Upskilling" />
            <span className="brand__wm"><b>Cebu Upskilling</b><span>Bridging the Gap Between Skills and Opportunity</span></span>
          </a>
          <p className="foot__tag">Learn Skills. Build Credentials. Find Opportunities.</p>
          <p className="foot__note">An early-stage workforce technology project from Cebu City, Philippines. Recognised with
            2nd Place at Cebu SolutionsFest 2026. No funding, investors, government endorsement or commercial
            partnerships are claimed on this page.</p>
        </div>
        <div>
          <h5>Product</h5>
          <ul>
            <li><a href="#product">Capabilities</a></li>
            <li><a href="#pathway">How it works</a></li>
            <li><a href="#ai">AI career matching</a></li>
            <li><a href="#score">Job Match Score</a></li>
          </ul>
        </div>
        <div>
          <h5>Who it's for</h5>
          <ul>
            <li><a href="#seekers">Job seekers</a></li>
            <li><a href="#employers">Employers &amp; SMEs</a></li>
            <li><a href="#providers">Training providers</a></li>
            <li><a href="#ecosystem">Workforce agencies</a></li>
          </ul>
        </div>
        <div>
          <h5>Company</h5>
          <ul>
            <li><a href="#about">About &amp; team</a></li>
            <li><a href="#pilot">Pilot</a></li>
            <li><a href="#model">Business model</a></li>
            <li><a href="mailto:hello@cebuupskilling.ph">Contact</a></li>
          </ul>
        </div>
      </div>
      <div className="foot__bot">
        <p>© 2026 Cebu Upskilling · Cebu City, Central Visayas, Philippines</p>
        <p>Labour statistics on this page are sourced from PSA-7. The Job Match Score is our own product framework, not
          a validated standard.</p>
      </div>
    </div>
  </footer>
    </div>
  );
}
