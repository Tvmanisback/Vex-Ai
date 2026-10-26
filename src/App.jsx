import { useEffect, useRef, useState } from 'react';
import {
  ArrowUp, Atom, Check, ChevronDown, Code2, Compass, Eye, EyeOff, Paperclip,
  GraduationCap, LogOut, Menu, MessageCircle, Moon, Plus, Settings2,
  ShieldCheck, Sparkles, Sun, BriefcaseBusiness, X, Smartphone, Monitor, Tablet
} from 'lucide-react';
import { isSupabaseConfigured, supabase } from './lib/supabase';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Copy, Download, FileArchive } from 'lucide-react';
import JSZip from 'jszip';

const suggestions = [
  { icon: Code2, title: 'Help me code', text: 'Debug code, explain concepts, and build projects.' },
  { icon: GraduationCap, title: 'Learn something', text: 'Understand a topic step by step.' },
  { icon: BriefcaseBusiness, title: 'Get work done', text: 'Plan tasks, write, and organize ideas.' },
  { icon: Sparkles, title: 'Explore an idea', text: 'Brainstorm something new and creative.' },
];

function CodeBlock({ language, code, children }) {
  const [copied, setCopied] = useState(false);

  function downloadCode() {
    const extensions = {
      javascript: 'js', js: 'js', jsx: 'jsx', typescript: 'ts', ts: 'ts', tsx: 'tsx',
      python: 'py', py: 'py', html: 'html', css: 'css', json: 'json', xml: 'xml',
      markdown: 'md', md: 'md', text: 'txt', txt: 'txt', plaintext: 'txt',
      bash: 'sh', sh: 'sh', shell: 'sh', sql: 'sql', yaml: 'yml', yml: 'yml',
      java: 'java', c: 'c', cpp: 'cpp', 'c++': 'cpp', csharp: 'cs', cs: 'cs',
      go: 'go', rust: 'rs', rs: 'rs', php: 'php', ruby: 'rb', rb: 'rb',
      swift: 'swift', kotlin: 'kt', kt: 'kt', dart: 'dart', r: 'r',
      powershell: 'ps1', ps1: 'ps1', ini: 'ini', toml: 'toml', csv: 'csv',
      diff: 'diff', dockerfile: 'Dockerfile', makefile: 'Makefile'
    };
    const ext = extensions[String(language || '').toLowerCase()] || 'txt';
    const filename = `vex-generated.${ext}`;
    const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      const area = document.createElement('textarea');
      area.value = code;
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      const succeeded = document.execCommand('copy');
      area.remove();
      if (succeeded) {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1800);
      }
    }
  }

  return <div className="code-block">
    <div className="code-block-header">
      <span className="code-language">{language}</span>
      <button type="button" className="copy-code-button" onClick={copyCode} aria-label="Copy code">
        {copied ? <Check size={14} /> : <Copy size={14} />}
        {copied ? 'Copied!' : 'Copy code'}
      </button>
      <button type="button" className="copy-code-button" onClick={downloadCode} aria-label="Download generated file"><Download size={14}/> Download</button>
    </div>
    <pre><code className={"language-" + language}>{children}</code></pre>
  </div>;
}

function ProjectZipButton({ text }) {
  const [zipUrl, setZipUrl] = useState('');
  const [fileCount, setFileCount] = useState(0);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    let createdUrl = '';
    async function buildZip() {
      const files = [];
      const pattern = /(?:^|\\n)(?:\\*\\*|###?\\s*)?(?:File:\\s*)?([\\x60][^\\n\\x60]+[\\x60]|[A-Za-z0-9_.@/-]+\\.[A-Za-z0-9_-]+)(?:\\*\\*)?\\s*\\n\\x60\\x60\\x60([\\w.+-]*)\\s*\\n([\\s\\S]*?)\\n\\x60\\x60\\x60/g;
      let match;
      while ((match = pattern.exec(text || '')) !== null) {
        const filename = match[1].replace(/^\\x60|\\x60$/g, '').trim();
        if (!filename || filename.includes(' ') || filename.startsWith('http')) continue;
        if (files.some(file => file.filename === filename)) continue;
        files.push({ filename, content: match[3] });
      }
      if (!files.length) return;
      try {
        const zip = new JSZip();
        for (const file of files) zip.file(file.filename, file.content);
        const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
        if (!active) return;
        createdUrl = URL.createObjectURL(blob);
        setZipUrl(createdUrl);
        setFileCount(files.length);
      } catch (e) {
        console.error('VEX project ZIP creation failed:', e);
        if (active) setError('VEX could not package this project into a ZIP. Please try asking again.');
      }
    }
    buildZip();
    return () => {
      active = false;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [text]);
  if (!zipUrl && !error) return null;
  if (error) return <div className="project-download" role="status">{error}</div>;
  return <div className="project-download" role="status">
    <div className="project-zip-message"><FileArchive size={18}/><span><strong>I made the ZIP for you!</strong><small>{fileCount} project files packaged and ready.</small></span></div>
    <a className="copy-code-button project-zip-link" href={zipUrl} download="vex-project.zip"><Download size={14}/> Download vex-project.zip</a>
  </div>;
}
function OrbitMark({ small = false }) {
  return <span className={`orbit-mark ${small ? 'orbit-mark-small' : ''}`} aria-hidden="true">
    <span className="orbit-core" /><span className="orbit-ring orbit-ring-one" /><span className="orbit-ring orbit-ring-two" />
  </span>;
}

function AuthScreen() {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const changeMode = (next) => { setMode(next); setNotice(''); setError(''); };

  async function submit(event) {
    event.preventDefault();
    setError(''); setNotice('');
    if (!isSupabaseConfigured) {
      setError('Supabase is not connected yet. Add your project URL and publishable key to the deployment environment.');
      return;
    }
    if (mode === 'register' && !/^[A-Za-z0-9_]{3,24}$/.test(username)) {
      setError('Username must be 3–24 characters and use only letters, numbers, or underscores.');
      return;
    }
    setBusy(true);
    try {
      if (mode === 'register') {
        const { data, error: authError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { username: username.trim() },
            emailRedirectTo: window.location.origin,
          },
        });
        if (authError) throw authError;
        if (data.session) setNotice('Account created. Welcome to VEX AI.');
        else setNotice('Account created! Check your email to confirm your address, then sign in.');
      } else {
        const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (authError) throw authError;
      }
    } catch (e) {
      setError(e?.message || 'Authentication failed. Please try again.');
    } finally { setBusy(false); }
  }

  async function googleSignIn() {
    setError(''); setNotice('');
    if (!isSupabaseConfigured) {
      setError('Connect Supabase first, then enable Google in Authentication → Providers.');
      return;
    }
    setBusy(true);
    try {
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.href.split('#')[0].split('?')[0], queryParams: { prompt: 'select_account' } },
      });
      if (authError) throw authError;
    } catch (e) {
      const message = e?.message || 'Google sign-in could not start.';
      if (/provider.*not enabled|unsupported provider/i.test(message)) {
        setError('Supabase rejected the Google provider. Check Authentication → Sign In / Providers → Google is enabled for this exact Supabase project, then save the provider settings.');
      } else if (/redirect.*(allow|url|not)/i.test(message)) {
        setError('Google sign-in reached a redirect URL error. Add https://tvmanisback.github.io/Vex-Ai/ to Supabase Authentication → URL Configuration → Redirect URLs.');
      } else {
        setError(message);
      }
      setBusy(false);
    }
  }

  async function discordSignIn() {
    setError(''); setNotice('');
    if (!isSupabaseConfigured) {
      setError('Supabase is not connected yet.');
      return;
    }
    setBusy(true);
    try {
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: 'discord',
        options: { redirectTo: window.location.href.split('#')[0].split('?')[0] },
      });
      if (authError) throw authError;
    } catch (e) {
      const message = e?.message || 'Discord sign-in could not start.';
      if (/provider.*not enabled|unsupported provider/i.test(message)) {
        setError('Discord sign-in is not enabled yet. In Supabase, open Authentication → Sign In / Providers → Discord, enable it, add your Discord Client ID and Client Secret, then save.');
      } else if (/redirect.*(allow|url|not)/i.test(message)) {
        setError('Add https://tvmanisback.github.io/Vex-Ai/ to Supabase Authentication → URL Configuration → Redirect URLs.');
      } else {
        setError(message);
      }
      setBusy(false);
    }
  }

  async function yapinSignIn() {
    setError(''); setNotice('');
    if (!isSupabaseConfigured) {
      setError('Supabase is not connected yet.');
      return;
    }
    setBusy(true);
    window.location.assign('https://xvtigczxiqunchwwypvf.supabase.co/functions/v1/yapin-auth/start');
  }

  return <main className="auth-layout">
    <section className="auth-art">
      <div className="art-grid" />
      <div className="auth-topbrand"><OrbitMark /><span>VEX AI</span></div>
      <div className="art-center">
        <div className="hero-orbit"><OrbitMark /></div>
        <p className="eyebrow"><span className="live-dot" /> YOUR SPACE TO THINK BIGGER</p>
        <h1>Meet your next<br /><span>great idea.</span></h1>
        <p className="art-copy">A little clarity. A lot of possibility.<br />All in one intelligent space.</p>
      </div>
      <div className="art-footer"><span>VEX AI</span><span>ONE INTELLIGENCE. ENDLESS POSSIBILITIES.</span></div>
    </section>
    <section className="auth-panel">
      <div className="mobile-brand"><OrbitMark small /><b>VEX AI</b></div>
      <div className="auth-card">
        <div className="auth-heading">
          <div className="mini-mark"><OrbitMark small /></div>
          <p className="eyebrow">WELCOME TO VEX</p>
          <h2>{mode === 'login' ? 'Good to see you.' : 'Make yourself at home.'}</h2>
          <p className="muted">{mode === 'login' ? 'Sign in to pick up where your mind left off.' : 'Create your account and meet your new AI.'}</p>
        </div>
        <div className="auth-tabs" role="tablist">
          <button className={mode === 'login' ? 'active' : ''} onClick={() => changeMode('login')} type="button">Log in</button>
          <button className={mode === 'register' ? 'active' : ''} onClick={() => changeMode('register')} type="button">Create account</button>
        </div>
        <button className="google-button" onClick={googleSignIn} type="button" disabled={busy} style={{ marginBottom: "10px" }}>
          <GoogleIcon /> Continue with Google
        </button>
        <button className="google-button discord-button" onClick={discordSignIn} type="button" disabled={busy} style={{ backgroundColor: "#5865F2", border: "1px solid #5865F2", color: "#fff", opacity: 1, filter: "none", marginTop: 0, marginBottom: 0 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M19.73 5.1A19.3 19.3 0 0 0 15 3.63l-.58 1.18a17.8 17.8 0 0 0-4.84 0L9 3.63A19.3 19.3 0 0 0 4.27 5.1C1.28 9.52.47 13.83.87 18.08a19.4 19.4 0 0 0 5.8 2.94l1.25-2.03a12.6 12.6 0 0 1-1.97-.96l.48-.37c3.8 1.78 7.92 1.78 11.67 0l.49.37c-.63.38-1.29.7-1.98.96l1.25 2.03a19.4 19.4 0 0 0 5.8-2.94c.47-4.93-.8-9.2-3.93-12.98ZM8.55 15.7c-1.14 0-2.08-1.05-2.08-2.34s.92-2.34 2.08-2.34 2.1 1.06 2.08 2.34c0 1.29-.92 2.34-2.08 2.34Zm6.9 0c-1.14 0-2.08-1.05-2.08-2.34s.92-2.34 2.08-2.34 2.1 1.06 2.08 2.34c0 1.29-.92 2.34-2.08 2.34Z"/></svg>
          Continue with Discord
        </button>
        <button className="google-button yapin-button" onClick={yapinSignIn} type="button" disabled={busy} style={{ backgroundColor: "#ff7a1a", border: "1px solid #ff7a1a", color: "#fff", opacity: 1, filter: "none" }}>
          <img src="https://yapin.gg/favicon.ico?v=2" alt="Yapin’" width="20" height="20" style={{ display: "block", width: 20, height: 20, objectFit: "contain", borderRadius: 4, flexShrink: 0 }} onError={e => { e.currentTarget.src = "https://www.yapin.gg/favicon.ico?v=2"; }} /> <span>Login with Yapin’</span>
        </button>
        <div className="divider"><span /> <small>OR WITH EMAIL</small> <span /></div>
        <form onSubmit={submit} className="auth-form">
          {mode === 'register' && <label>Username<div className="input-wrap"><span className="input-prefix">@</span><input value={username} onChange={e => setUsername(e.target.value)} placeholder="yourname" minLength={3} maxLength={24} autoComplete="username" required /></div><small className="field-help">3–24 letters, numbers, or underscores</small></label>}
          <label>Email address<div className="input-wrap"><input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" required /></div></label>
          <label>Password<div className="input-wrap"><input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder={mode === 'register' ? 'At least 8 characters' : 'Enter your password'} autoComplete={mode === 'register' ? 'new-password' : 'current-password'} minLength={mode === 'register' ? 8 : 1} required /><button className="password-toggle" type="button" onClick={() => setShowPassword(v => !v)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></label>
          {error && <div className="form-message error" role="alert">{error}</div>}
          {notice && <div className="form-message success" role="status"><Check size={16} />{notice}</div>}
          <button className="primary-button" type="submit" disabled={busy}>{busy ? <span className="spinner" /> : null}{mode === 'login' ? 'Log in to VEX' : 'Create account'}<ArrowUp size={17} className="button-arrow" /></button>
        </form>
        <p className="auth-switch">{mode === 'login' ? "New around here? " : 'Already have an account? '}<button onClick={() => changeMode(mode === 'login' ? 'register' : 'login')} type="button">{mode === 'login' ? 'Create an account' : 'Log in'}</button></p>
        <p className="legal"><ShieldCheck size={14} /> Your account is secured by Supabase authentication.</p>
      </div>
      <div className="auth-bottom"><span>© 2026 VEX AI · <a href="./PaP">Privacy Policy</a> · <a href="./ToS">Terms of Service</a></span><span>BUILT FOR WHAT'S NEXT <Sparkles size={12} /></span></div>
    </section>
  </main>;
}

function GoogleIcon() {
  return <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" transform="translate(0 5)"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.75 7.18l7.73 6C44.43 37.98 46.98 31.88 46.98 24.55z"/><path fill="#FBBC05" d="M10.53 28.59a14.4 14.4 0 0 1 0-9.18l-7.98-6.19a23.94 23.94 0 0 0 0 21.56l7.98-6.19z" transform="translate(0 0)"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.91-5.8l-7.73-6c-2.14 1.45-4.89 2.3-8.18 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>;
}

function ChatApp({ session }) {
  const [uiMode, setUiMode] = useState(() => {
    try {
      const saved = localStorage.getItem('vex-ui-mode');
      if (saved === 'mobile' || saved === 'ipad' || saved === 'pc') return saved;
    } catch (_) {}
    const nav = window.navigator;
    const ua = nav.userAgent || '';
    const isMobileUA = Boolean(nav.userAgentData?.mobile) || /iPhone|iPod|Android.*Mobile|Windows Phone|Mobile/i.test(ua);
    const isTablet = /iPad|Tablet|Android(?!.*Mobile)/i.test(ua) || (nav.maxTouchPoints > 1 && Math.min(window.screen.width, window.screen.height) <= 1100);
    return isTablet ? 'ipad' : isMobileUA ? 'mobile' : 'pc';
  });
  useEffect(() => {
    try { localStorage.setItem('vex-ui-mode', uiMode); } catch (_) {}
  }, [uiMode]);

  const [profile, setProfile] = useState(null);
  const [messages, setMessages] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [currentChatId, setCurrentChatId] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [readingFiles, setReadingFiles] = useState(false);
  const fileInputRef = useRef(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountSettingsOpen, setAccountSettingsOpen] = useState(false);
  const [settingsUsername, setSettingsUsername] = useState('');
  const [settingsCurrentPassword, setSettingsCurrentPassword] = useState('');
  const [settingsPassword, setSettingsPassword] = useState('');
  const [settingsNotice, setSettingsNotice] = useState('');
  const [settingsError, setSettingsError] = useState('');
  const [settingsBusy, setSettingsBusy] = useState(false);
  const [mobileSidebar, setMobileSidebar] = useState(false);
  const [dark, setDark] = useState(true);
  const endRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    let active = true;
    async function loadProfile() {
      const { data } = await supabase.from('profiles').select('username').eq('id', session.user.id).maybeSingle();
      if (active) setProfile(data || { username: session.user.user_metadata?.username || session.user.email?.split('@')[0] || 'friend' });
    }
    loadProfile();
    return () => { active = false; };
  }, [session.user.id]);

  useEffect(() => {
    let active = true;
    async function loadConversations() {
      setHistoryLoading(true);
      const { data, error: loadError } = await supabase
        .from('conversations')
        .select('id,title,messages,updated_at')
        .eq('user_id', session.user.id)
        .order('updated_at', { ascending: false })
        .limit(50);
      if (active) {
        if (!loadError && data) setConversations(data);
        setHistoryLoading(false);
      }
    }
    loadConversations();
    return () => { active = false; };
  }, [session.user.id]);

  function startNewChat() {
    setCurrentChatId(null);
    setMessages([]);
    setInput('');
    setError('');
    setMobileSidebar(false);
  }

  function openChat(chat) {
    setCurrentChatId(chat.id);
    setMessages(Array.isArray(chat.messages) ? chat.messages : []);
    setInput('');
    setError('');
    setMobileSidebar(false);
  }

  async function saveChat(chatId, title, chatMessages) {
    const row = {
      id: chatId,
      user_id: session.user.id,
      title,
      messages: chatMessages,
      updated_at: new Date().toISOString(),
    };
    const { error: saveError } = await supabase.from('conversations').upsert(row);
    if (saveError) {
      console.error('Could not save VEX conversation:', saveError.message);
      setError('Your reply worked, but chat saving failed. Run the saved-chat SQL setup in Supabase, then try again.');
      return false;
    }
    setConversations(previous => [row, ...previous.filter(chat => chat.id !== chatId)].slice(0, 50));
    return true;
  }

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [messages, sending]);

  async function addFiles(fileList) {
    const picked = Array.from(fileList || []);
    if (!picked.length) return;
    setReadingFiles(true);
    setError('');
    try {
      const next = [];
      let totalChars = attachments.reduce((n, a) => n + (a.content || '').length, 0);
      for (const file of picked) {
        if (file.size > 10 * 1024 * 1024) throw new Error(file.name + ' is over the 10 MB per-file limit.');
        const name = file.name;
        const lower = name.toLowerCase();
        if (file.type.startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp|avif)$/i.test(lower)) {
          const imageData = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(new Error('Could not read image: ' + name));
            reader.readAsDataURL(file);
          });
          next.push({ name, content: '', imageData, mimeType: file.type || 'image/jpeg' });
        } else if (/\.zip$/i.test(lower) || file.type === 'application/zip') {
          const zip = await JSZip.loadAsync(file);
          for (const [path, entry] of Object.entries(zip.files)) {
            if (entry.dir || path.startsWith('__MACOSX/') || /(^|\/)\./.test(path)) continue;
            if (!/\.(txt|md|json|js|jsx|ts|tsx|py|html|css|xml|csv|yml|yaml|toml|sql|sh|java|cs|cpp|c|h|go|rs|php|rb|swift|kt|dart|log|ini|env|svg)$/i.test(path)) continue;
            const content = await entry.async('string');
            totalChars += content.length;
            if (totalChars > 120000) throw new Error('These files exceed the 120,000-character total limit. Upload fewer or smaller files.');
            next.push({ name: path, content });
          }
        } else if (/\.pdf$/i.test(lower) || file.type === 'application/pdf') {
          const pdfjs = await import('https://esm.sh/pdfjs-dist@4.10.38/build/pdf.mjs');
          const pdf = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()), useWorkerFetch: false, isEvalSupported: false, disableFontFace: true }).promise;
          const pages = [];
          for (let pageNo = 1; pageNo <= Math.min(pdf.numPages, 80); pageNo++) {
            const page = await pdf.getPage(pageNo);
            const data = await page.getTextContent();
            pages.push('[Page ' + pageNo + '] ' + data.items.map(item => item.str || '').join(' '));
          }
          const content = pages.join('\n');
          totalChars += content.length;
          if (totalChars > 120000) throw new Error('These files exceed the 120,000-character total limit.');
          next.push({ name, content });
        } else if (/\.(txt|md|json|js|jsx|ts|tsx|py|html|css|xml|csv|yml|yaml|toml|sql|sh|java|cs|cpp|c|h|go|rs|php|rb|swift|kt|dart|log|ini|env|svg|config|gradle|properties)$/i.test(lower) || file.type.startsWith('text/')) {
          const content = await file.text();
          totalChars += content.length;
          if (totalChars > 120000) throw new Error('These files exceed the 120,000-character total limit.');
          next.push({ name, content });
        } else throw new Error('Unsupported file type: ' + name + '. Upload code/text files, PDFs, or ZIP archives.');
      }
      setAttachments(previous => [...previous, ...next]);
    } catch (e) { setError(e?.message || 'Could not read those files.'); }
    finally { setReadingFiles(false); if (fileInputRef.current) fileInputRef.current.value = ''; }
  }

  async function sendMessage(text = input) {
    const userText = text.trim();
    if ((!userText && !attachments.length) || sending || readingFiles) return;
    const fileContext = attachments.filter(file => !file.imageData).map(file => '\n\n--- ATTACHED FILE: ' + file.name + ' ---\n' + file.content + '\n--- END FILE ---').join('');
    const imageAttachments = attachments.filter(file => file.imageData).map(file => ({ name: file.name, dataUrl: file.imageData, mimeType: file.mimeType }));
    const prompt = (userText || 'Please inspect the attached file(s) and help me with them.') + (fileContext ? '\n\nThe user attached these files. Read their contents and use them as context; refer to files by filename.\n' + fileContext : '') + (imageAttachments.length ? '\n\nThe user attached ' + imageAttachments.length + ' image(s): ' + imageAttachments.map(f => f.name).join(', ') + '. Analyze the actual image(s) and answer the user request.' : '');
    const attachedNames = attachments.map(file => file.name);
    setAttachments([]);
    setError('');
    const isNewChat = !currentChatId;
    const chatId = currentChatId || crypto.randomUUID();
    const previousMessages = messages;
    const nextMessages = [...previousMessages, { role: 'user', text: userText || 'Please inspect the attached file(s).', attachments: attachedNames }];
    const fallbackTitle = prompt.split(/\s+/).slice(0, 6).join(' ').slice(0, 64) || 'New chat';
    setCurrentChatId(chatId);
    setMessages(nextMessages);
    setInput('');
    setSending(true);
    let chatTitle = conversations.find(chat => chat.id === chatId)?.title || fallbackTitle;
    try {
      const history = previousMessages.slice(-12).map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.text }] }));
      const { data, error: invokeError } = await supabase.functions.invoke('vex-chat', { body: { message: prompt, history, images: imageAttachments.map(({name, dataUrl, mimeType}) => ({name, dataUrl, mimeType})) } });
      if (invokeError) throw invokeError;
      if (data?.error) throw new Error(data.error);

      const completedMessages = [...nextMessages, { role: 'assistant', text: data.reply }];
      setMessages(completedMessages);

      if (isNewChat) {
        try {
          const { data: titleData } = await supabase.functions.invoke('vex-chat', {
            body: { action: 'title', message: prompt },
          });
          if (typeof titleData?.title === 'string' && titleData.title.trim()) chatTitle = titleData.title.trim().slice(0, 64);
        } catch (_) {
          // Saving still works with a short fallback title if title generation is unavailable.
        }
      }
      await saveChat(chatId, chatTitle, completedMessages);
    } catch (e) {
      let message = e?.message || 'Could not reach VEX. Check the Edge Function setup and try again.';
      if (/failed to send a request to the edge function|failed to fetch|networkerror|network request failed/i.test(message)) {
        message = 'VEX could not connect to its server. The vex-chat Edge Function may need to be redeployed in Supabase. If it still fails after redeploying, check the current function logs.';
      }
      try {
        const response = e?.context;
        if (response && typeof response.clone === 'function') {
          const body = await response.clone().json();
          if (typeof body?.error === 'string' && body.error.trim()) message = body.error;
          else if (typeof body?.message === 'string' && body.message.trim()) message = body.message;
        }
      } catch (_) {}
      setError(message);
      // Keep the user's message in history even if the AI request failed.
      await saveChat(chatId, chatTitle, nextMessages);
    } finally { setSending(false); inputRef.current?.focus(); }
  }

  async function signOut() { await supabase.auth.signOut(); }
  const username = profile?.username || session.user.email?.split('@')[0] || 'friend';
  async function saveAccountSettings(event) {
    event.preventDefault(); setSettingsNotice(''); setSettingsError(''); setSettingsBusy(true);
    try {
      const nextUsername = settingsUsername.trim();
      if (!/^[A-Za-z0-9_]{3,24}$/.test(nextUsername)) throw new Error('Username must be 3–24 characters using letters, numbers, or underscores.');
      const { error: profileError } = await supabase.from('profiles').upsert({ id: session.user.id, username: nextUsername });
      if (profileError) throw new Error('Could not save username. Check profiles table permissions in Supabase.');
      const { error: metadataError } = await supabase.auth.updateUser({ data: { username: nextUsername } });
      if (metadataError) throw metadataError;
      if (settingsPassword || settingsCurrentPassword) {
        if (!settingsCurrentPassword) throw new Error('Enter your current password to change it.');
        if (!settingsPassword) throw new Error('Enter a new password.');
        if (settingsPassword.length < 8) throw new Error('New password must be at least 8 characters.');
        if (settingsPassword === settingsCurrentPassword) throw new Error('Your new password must be different from your current password.');
        const { error: verifyError } = await supabase.auth.signInWithPassword({ email: session.user.email, password: settingsCurrentPassword });
        if (verifyError) throw new Error('Your current password is incorrect.');
        const { error: passwordError } = await supabase.auth.updateUser({ password: settingsPassword });
        if (passwordError) throw passwordError;
      }
      setProfile({ ...(profile || {}), username: nextUsername }); setSettingsCurrentPassword(''); setSettingsPassword(''); setSettingsNotice('Account settings saved.');
    } catch (e) { setSettingsError(e?.message || 'Could not save account settings.'); } finally { setSettingsBusy(false); }
  }

  return <main className={`app-shell ui-mode-${uiMode} ${dark ? 'theme-dark' : 'theme-light'}`}>
    <aside className={`sidebar ${mobileSidebar ? 'sidebar-open' : ''}`} style={uiMode === 'mobile' || uiMode === 'ipad' ? { position: 'fixed', zIndex: 1002, top: uiMode === 'ipad' ? '2vh' : '4vh', left: mobileSidebar ? (uiMode === 'ipad' ? '2vw' : '4vw') : '-100vw', width: uiMode === 'ipad' ? 'min(34vw, 340px)' : '92vw', maxWidth: uiMode === 'ipad' ? '340px' : '520px', height: uiMode === 'ipad' ? '88dvh' : '92dvh', maxHeight: uiMode === 'ipad' ? '88dvh' : '92dvh', overflowY: 'auto', borderRadius: '20px', transition: 'left 220ms ease', boxShadow: mobileSidebar ? '0 24px 80px rgba(0,0,0,.55)' : 'none', visibility: mobileSidebar ? 'visible' : 'hidden' } : undefined}>
      <div className="sidebar-brand"><OrbitMark small /><span>FROST<span className="brand-ai">AI</span></span><button className="mobile-close" onClick={() => setMobileSidebar(false)}><X size={18}/></button></div>
      <button className="new-chat" onClick={startNewChat}><Plus size={17}/> New chat</button>
      <div className="side-label">YOUR CHATS</div>
      <div className="chat-history-list">
        {historyLoading && <div className="history-empty">Loading chats…</div>}
        {!historyLoading && conversations.length === 0 && <div className="history-empty">Your saved chats will appear here.</div>}
        {conversations.map(chat => <button className={currentChatId === chat.id ? 'chat-history-item active' : 'chat-history-item'} key={chat.id} onClick={() => openChat(chat)} title={chat.title}><MessageCircle size={15}/><span>{chat.title || 'New chat'}</span></button>)}
      </div>
      <div className="side-label tools-label">YOUR SPACE</div>
      <button className="side-link selected" onClick={startNewChat}><MessageCircle size={17}/> VEX Assistant</button>
      <div className="side-label tools-label">EXPLORE</div>
      <button className="side-link" onClick={() => sendMessage('Help me write and debug some code.')}><Code2 size={17}/> Coding</button>
      <button className="side-link" onClick={() => sendMessage('Help me study a topic step by step.')}><GraduationCap size={17}/> Learning</button>
      <button className="side-link" onClick={() => sendMessage('Help me organize my work tasks and priorities.')}><BriefcaseBusiness size={17}/> Work & tasks</button>
      <div className="sidebar-bottom">
        <div className="plan-card"><div className="plan-icon"><Sparkles size={16}/></div><div><b>Your ideas, amplified.</b><p>Make room for what's next.</p></div></div>
        <button className="profile-button" onClick={() => setMenuOpen(v => !v)}><span className="avatar">{username.slice(0,1).toUpperCase()}</span><span className="profile-info"><b>{username}</b><small>{session.user.email}</small></span><ChevronDown size={16}/></button>
        {menuOpen && <div className="profile-menu"><button onClick={() => { setSettingsUsername(username); setSettingsCurrentPassword(''); setSettingsPassword(''); setSettingsNotice(''); setSettingsError(''); setAccountSettingsOpen(true); setMenuOpen(false); }}><Settings2 size={16}/> Account settings</button><button onClick={() => setDark(v => !v)}>{dark ? <Sun size={16}/> : <Moon size={16}/>} Switch appearance</button><button onClick={signOut}><LogOut size={16}/> Sign out</button></div>}
      </div>
    </aside>
    {accountSettingsOpen && <div role="presentation" onClick={() => setAccountSettingsOpen(false)} style={{position:'fixed',inset:0,zIndex:2000,background:'rgba(0,0,0,.68)',display:'grid',placeItems:'center',padding:18}}>
      <section role="dialog" aria-modal="true" aria-labelledby="account-settings-title" onClick={e => e.stopPropagation()} style={{width:'min(100%,520px)',maxHeight:'90dvh',overflowY:'auto',background:dark?'#0d1626':'#fff',color:dark?'#edf4ff':'#142033',border:'1px solid #34445f',borderRadius:20,padding:24}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}><h2 id="account-settings-title">Account settings</h2><button type="button" onClick={() => setAccountSettingsOpen(false)} aria-label="Close"><X size={20}/></button></div>
        <form onSubmit={saveAccountSettings} style={{display:'grid',gap:14,marginTop:16}}>
          <label>Email address<input value={session.user.email || ''} readOnly style={{display:'block',width:'100%',padding:12,marginTop:6,borderRadius:10}}/><small>Email changes are not available here.</small></label>
          <label>Username<input value={settingsUsername} onChange={e=>setSettingsUsername(e.target.value)} minLength={3} maxLength={24} pattern="[A-Za-z0-9_]{3,24}" required style={{display:'block',width:'100%',padding:12,marginTop:6,borderRadius:10}}/><small>3–24 letters, numbers, or underscores.</small></label>
          <label>Current password (required to change password)<input type="password" value={settingsCurrentPassword} onChange={e=>setSettingsCurrentPassword(e.target.value)} autoComplete="current-password" placeholder="Enter current password" style={{display:'block',width:'100%',padding:12,marginTop:6,borderRadius:10}}/></label>
          <label>New password (optional)<input type="password" value={settingsPassword} onChange={e=>setSettingsPassword(e.target.value)} minLength={8} autoComplete="new-password" placeholder="Enter a new password" style={{display:'block',width:'100%',padding:12,marginTop:6,borderRadius:10}}/><small>At least 8 characters. Leave both password fields blank if you do not want to change it.</small></label>
          <div style={{border:'1px solid #34445f',borderRadius:12,padding:14,display:'flex',alignItems:'center',justifyContent:'space-between',gap:12}}><div><b>Two-factor authentication (2FA)</b><p style={{margin:'5px 0 0',fontSize:13,opacity:.75}}>Add an extra layer of sign-in security.</p></div><button type="button" disabled title="Coming soon" style={{padding:'9px 12px',borderRadius:9,border:'1px solid #34445f',background:'transparent',color:'inherit',opacity:.7,cursor:'not-allowed'}}>Coming soon</button></div>
          {settingsError && <p role="alert">{settingsError}</p>}{settingsNotice && <p role="status">{settingsNotice}</p>}
          <button type="submit" disabled={settingsBusy}>{settingsBusy?'Saving…':'Save settings'}</button>
        </form>
      </section>
    </div>}
    {mobileSidebar && <button className="sidebar-scrim" onClick={() => setMobileSidebar(false)} aria-label="Close navigation" />}
    <section className="chat-area">
      <header className="app-header"><div className="header-left"><button className="menu-button" onClick={() => setMobileSidebar(true)} aria-label="Open chat navigation"><Menu size={20}/></button><button className="mobile-chats-button" onClick={() => setMobileSidebar(true)} style={uiMode === 'mobile' || uiMode === 'ipad' ? { display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 12px', borderRadius: 12, fontWeight: 700, flexShrink: 0 } : undefined}><MessageCircle size={16}/><span>Chats</span></button><div className="vex-mini"><OrbitMark small/><span>VEX <b>AI</b></span></div><span className="header-divider"/><span className="model-label"><span className="live-dot"/> VEX assistant</span></div><div className="header-right"><span className="secure-label"><ShieldCheck size={14}/> Private space</span><div className="ui-mode-switch" role="group" aria-label="Interface layout"><button type="button" className={uiMode === 'mobile' ? 'active' : ''} onClick={() => setUiMode('mobile')} title="Mobile layout" aria-label="Use mobile layout"><Smartphone size={15}/><span>Mobile</span></button><button type="button" className={uiMode === 'ipad' ? 'active' : ''} onClick={() => setUiMode('ipad')} title="iPad layout" aria-label="Use iPad layout"><Tablet size={15}/><span>iPad</span></button><button type="button" className={uiMode === 'pc' ? 'active' : ''} onClick={() => setUiMode('pc')} title="Desktop layout" aria-label="Use desktop layout"><Monitor size={15}/><span>PC</span></button></div><button className="header-icon" onClick={() => setDark(v => !v)} title="Toggle appearance">{dark ? <Sun size={17}/> : <Moon size={17}/>}</button></div></header>
      <div className={`conversation ${messages.length ? 'has-messages' : ''}`}>
        {messages.length === 0 ? <div className="welcome">
          <div className="welcome-emblem"><OrbitMark/></div>
          <p className="eyebrow"><span className="live-dot"/> YOUR AI, YOUR PACE</p>
          <h1>Hey {username},<br/><span>what's on your mind?</span></h1>
          <p className="welcome-copy">I'm VEX. Let's untangle a problem, learn something new,<br className="desktop-break"/> or turn that idea into something real.</p>
          <div className="suggestion-grid">{suggestions.map(({icon: Icon, title, text}) => <button className="suggestion-card" key={title} onClick={() => { setInput(title === 'Help me code' ? 'Help me with a coding project.' : title === 'Learn something' ? 'Teach me something interesting, step by step.' : title === 'Get work done' ? 'Help me plan my tasks for today.' : 'Help me brainstorm a creative idea.'); inputRef.current?.focus(); }}><span className="suggestion-icon"><Icon size={18}/></span><b>{title}</b><small>{text}</small></button>)}</div>
        </div> : <div className="message-list">{messages.map((m,i) => <div className={`message-row ${m.role}`} key={i}><div className="message-avatar">{m.role === 'assistant' ? <OrbitMark small/> : username.slice(0,1).toUpperCase()}</div><div className="message-body"><div className="message-name">{m.role === 'assistant' ? 'VEX AI' : username}</div><div className={"message-text markdown-content " + (m.role === 'user' ? 'user-markdown' : '')}>{m.attachments?.length > 0 && <div className="attached-message-files">{m.attachments.map(name => <span key={name}><Paperclip size={12}/>{name}</span>)}</div>}{m.role === 'assistant' && <ProjectZipButton text={m.text} />}<ReactMarkdown remarkPlugins={[remarkGfm]} components={{
                    pre: ({ children, ...props }) => {
                      const child = Array.isArray(children) ? children[0] : children;
                      const codeClass = child?.props?.className || '';
                      const language = codeClass.match(/language-([\\w+-]+)/)?.[1] || 'text';
                      const codeText = typeof child?.props?.children === 'string'
                        ? child.props.children
                        : Array.isArray(child?.props?.children)
                          ? child.props.children.join('')
                          : String(child?.props?.children ?? '');
                      return <CodeBlock language={language} code={codeText}>{children}</CodeBlock>;
                    }
                  }}>{m.text}</ReactMarkdown></div></div></div>)}{sending && <div className="message-row assistant"><div className="message-avatar"><OrbitMark small/></div><div className="message-body"><div className="message-name">VEX AI</div><div className="typing"><i/><i/><i/></div></div></div>}<div ref={endRef}/></div>}
      </div>
      <div className="composer-wrap"><input ref={fileInputRef} type="file" multiple accept="image/*,.zip,.pdf,.txt,.md,.json,.js,.jsx,.ts,.tsx,.py,.html,.css,.xml,.csv,.yml,.yaml,.toml,.sql,.sh,.java,.cs,.cpp,.c,.h,.go,.rs,.php,.rb,.swift,.kt,.dart,.log,.ini,.env,.svg,.config,.gradle,.properties,text/*,application/pdf,application/zip" className="hidden-file-input" onChange={e => addFiles(e.target.files)} /><form className="composer" onSubmit={e => {e.preventDefault(); sendMessage();}}><textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => {if (e.key === 'Enter' && !e.shiftKey) {e.preventDefault(); sendMessage();}}} placeholder="Ask VEX anything..." rows={1} maxLength={8000} aria-label="Message VEX AI" /><div className="composer-tools"><span><Sparkles size={14}/> Upload files or ask VEX to search the web</span><div className="composer-actions"><button className="attach-button" type="button" onClick={() => fileInputRef.current?.click()} disabled={sending || readingFiles}><Paperclip size={16}/>{readingFiles ? "Reading…" : "Attach"}</button><button className="send-button" type="submit" disabled={(!input.trim() && !attachments.length) || sending || readingFiles} aria-label="Send message"><ArrowUp size={18}/></button></div></div></form>{attachments.length > 0 && <div className="attachment-tray">{attachments.map((file, i) => <span className="attachment-chip" key={file.name + i}>{file.imageData ? <img className="attachment-thumb" src={file.imageData} alt={file.name}/> : <Paperclip size={12}/>}<span>{file.name}</span><button type="button" onClick={() => setAttachments(prev => prev.filter((_, j) => j !== i))} aria-label={"Remove " + file.name}>×</button></span>)}</div>}{error && <p className="chat-error">{error}</p>}<p className="disclaimer">VEX can make mistakes. Check important information. Uploaded file contents are sent to VEX to answer your message. <a href="./PaP">Privacy Policy</a> · <a href="./ToS">Terms of Service</a></p></div>
    </section>
  </main>;
}

export default function App() {
  const [session, setSession] = useState(undefined);
  const [configError, setConfigError] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured) { setConfigError(true); setSession(null); return; }
    let alive = true;
    const fragment = new URLSearchParams(window.location.hash.slice(1));
    const accessToken = fragment.get('access_token');
    const refreshToken = fragment.get('refresh_token');
    const isYapinCallback = Boolean(accessToken && refreshToken);
    if (isYapinCallback) {
      // Remove OAuth tokens from the address bar immediately.
      window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
      supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
        .then(({ data, error }) => {
          if (!alive) return;
          if (error) {
            console.error('Could not establish Yapin session:', error.message);
            setSession(null);
            window.location.replace(window.location.pathname + '?yapin_error=session_setup');
            return;
          }
          setSession(data.session);
        });
    } else {
      supabase.auth.getSession().then(({ data }) => { if (alive) setSession(data.session); });
    }
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (alive) setSession(nextSession);
    });
    return () => { alive = false; subscription.unsubscribe(); };
  }, []);

  if (session === undefined) return <div className="loading-screen"><OrbitMark/><span>Waking up VEX...</span></div>;
  return <>{configError && <div className="config-banner">Setup needed: add your Supabase URL and publishable key to the environment variables.</div>}{session ? <ChatApp session={session}/> : <AuthScreen/>}</>;
}
