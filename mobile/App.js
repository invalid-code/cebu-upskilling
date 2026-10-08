import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { logger } from './logger';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api';
const colors = { bg: '#e8f0ee', surface: '#f5faf8', ink: '#1a2e27', muted: '#5c7a6e', line: '#c4d6cd', teal: '#1a6b5a', coral: '#d4775c', soft: '#c6e6df' };

// ---- GET response cache (memory + AsyncStorage) ----
// Mirrors the web client's api cache: 20s memory TTL with in-flight
// coalescing, plus 5min persisted catalog so tabs paint instantly (and work
// briefly offline). Keys embed the session token: users never share entries.
// Successful mutations, logout, and 401 session resets evict. Pull-to-refresh
// passes { bypassCache: true }.
const GET_CACHE_TTL_MS = 20000;
const PERSISTED_CACHE_TTL_MS = 5 * 60 * 1000;
const PERSISTED_PREFIX = 'api-cache:v1:';
// Slow-moving reads worth persisting. Write-heavy personal lists
// (applications) always go to the network so a restart never resurrects
// pre-mutation state.
const PERSISTED_ALLOWLIST = ['/posts', '/courses', '/coursespage', '/skills', '/markettrends', '/skillgaps', '/learningpathways', '/stats/week'];
const getCache = new Map();
const inflightGets = new Map();

function tokenScope(token) {
  return token ? `t:${String(token).slice(-12)}` : 'anon';
}

function getCacheKey(path, token) {
  return `${tokenScope(token)} ${path}`;
}

function isAuthPath(path) {
  return path === '/auth' || (typeof path === 'string' && path.startsWith('/auth/'));
}

function isPersistable(path) {
  if (typeof path !== 'string') return false;
  const clean = path.split('?')[0];
  return PERSISTED_ALLOWLIST.some((p) => clean === p || clean.startsWith(`${p}/`));
}

function readGetCache(key) {
  const entry = getCache.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiry) {
    getCache.delete(key);
    return undefined;
  }
  return entry.data;
}

function writeGetCache(key, data) {
  getCache.set(key, { expiry: Date.now() + GET_CACHE_TTL_MS, data });
  while (getCache.size > 200) {
    getCache.delete(getCache.keys().next().value);
  }
}

async function readPersistedCache(key) {
  try {
    const raw = await AsyncStorage.getItem(PERSISTED_PREFIX + key);
    if (!raw) return undefined;
    const entry = JSON.parse(raw);
    if (!entry || typeof entry.expiry !== 'number' || Date.now() > entry.expiry) {
      AsyncStorage.removeItem(PERSISTED_PREFIX + key).catch(() => {});
      return undefined;
    }
    return entry.data;
  } catch {
    return undefined;
  }
}

async function writePersistedCache(key, data) {
  try {
    await AsyncStorage.setItem(PERSISTED_PREFIX + key, JSON.stringify({ expiry: Date.now() + PERSISTED_CACHE_TTL_MS, data }));
  } catch {
    // Quota/full storage: the memory cache still applies.
  }
}

async function evictPersistedCache() {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const ours = keys.filter((k) => k.startsWith(PERSISTED_PREFIX));
    if (ours.length > 0) await AsyncStorage.multiRemove(ours);
  } catch {
    // Cache eviction is best-effort.
  }
}

function evictMemoryCache() {
  getCache.clear();
  inflightGets.clear();
}

async function evictCaches() {
  evictMemoryCache();
  await evictPersistedCache();
}

async function request(path, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const hasBody = options.body != null;
  const { bypassCache, ...fetchOptions } = options;
  logger.debug(`[API] ${method} ${path}`);
  // Set by AuthProvider: clears the signed-in user when the server rejects
  // the token (mirrors the web client's 401 handling).
  const onUnauthorized = request.onUnauthorized;
  let token = null;
  try {
    token = await SecureStore.getItemAsync('token');
  } catch {
    token = null;
  }
  if (method === 'GET' && !isAuthPath(path) && bypassCache !== true) {
    const key = getCacheKey(path, token);
    const cached = readGetCache(key);
    if (cached !== undefined) {
      logger.debug(`[API] GET ${path} (memory HIT)`);
      return cached;
    }
    if (isPersistable(path)) {
      const persisted = await readPersistedCache(key);
      if (persisted !== undefined) {
        logger.debug(`[API] GET ${path} (persisted HIT)`);
        writeGetCache(key, persisted);
        return persisted;
      }
    }
    const pending = inflightGets.get(key);
    if (pending) {
      logger.debug(`[API] GET ${path} (coalesced)`);
      return pending;
    }
    const promise = sendRequest(path, fetchOptions, method, hasBody, onUnauthorized, token, {
      key,
      persist: isPersistable(path),
    });
    inflightGets.set(key, promise);
    promise.then(
      () => inflightGets.delete(key),
      () => inflightGets.delete(key),
    );
    return promise;
  }
  const data = await sendRequest(path, fetchOptions, method, hasBody, onUnauthorized, token, null);
  if (method !== 'GET') await evictCaches();
  return data;
}

async function sendRequest(path, fetchOptions, method, hasBody, onUnauthorized, token, cacheInfo) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  try {
    const headers = {
      ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...fetchOptions.headers,
    };
    const response = await fetch(`${API_URL}${path}`, { ...fetchOptions, headers, signal: controller.signal });
    let data = null;
    if (response.status !== 204) {
      const text = await response.text();
      if (text) {
        try {
          data = JSON.parse(text);
        } catch {
          data = { error: text.slice(0, 200) };
        }
      }
    }
    if (!response.ok) {
      logger.warn(`[API] ${method} ${path} → ${response.status}: ${data?.error || ''}`);
      if (response.status === 401 && typeof onUnauthorized === 'function') {
        try { await onUnauthorized(); } catch { /* session cleanup is best-effort */ }
      }
      const error = new Error(data?.error || `Request failed (${response.status})`);
      error.status = response.status;
      throw error;
    }
    logger.debug(`[API] ${method} ${path} → ${response.status}`);
    if (cacheInfo) {
      writeGetCache(cacheInfo.key, data);
      if (cacheInfo.persist) await writePersistedCache(cacheInfo.key, data);
    }
    return data;
  } catch (error) {
    if (error?.name === 'AbortError') {
      const timeoutError = new Error('Request timed out — check your connection and try again');
      timeoutError.status = 0;
      throw timeoutError;
    }
    if (error?.status == null) {
      logger.error(`[API] ${method} ${path} → network error`, error?.message || error);
      const networkError = new Error(error?.message || 'Network error — check your connection and try again');
      networkError.status = 0;
      throw networkError;
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

const AuthContext = createContext(null);
function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);
  useEffect(() => {
    request.onUnauthorized = async () => {
      try {
        await SecureStore.deleteItemAsync('token');
        await SecureStore.deleteItemAsync('user');
      } finally {
        setUser(null);
      }
      evictCaches().catch(() => {});
      logger.info('[Auth] Session expired, signed out');
    };
    SecureStore.getItemAsync('user').then((value) => {
      if (!value) { logger.debug('[Auth] No stored session'); return; }
      try {
        setUser(JSON.parse(value));
        logger.info('[Auth] Session restored from secure storage');
      } catch {
        SecureStore.deleteItemAsync('user').catch(() => {});
        SecureStore.deleteItemAsync('token').catch(() => {});
        logger.warn('[Auth] Stored session was corrupt, cleared');
      }
    }).catch((error) => logger.warn('[Auth] Failed to restore session:', error?.message || error)).finally(() => setChecking(false));
    return () => { request.onUnauthorized = null; };
  }, []);
  const login = async (email, password) => { const cleanEmail = (email || '').trim(); const data = await request('/auth/login', { method: 'POST', body: JSON.stringify({ emailAddress: cleanEmail, password }) }); await SecureStore.setItemAsync('token', data.token); await SecureStore.setItemAsync('user', JSON.stringify(data)); setUser(data); logger.info(`[Auth] Signed in as ${data.emailAddress || data.email}`); };
  const logout = async () => {
    try {
      const token = await SecureStore.getItemAsync('token');
      if (token) {
        await fetch(`${API_URL}/auth/logout`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
      }
    } finally {
      await SecureStore.deleteItemAsync('token');
      await SecureStore.deleteItemAsync('user');
      setUser(null);
      await evictCaches();
      logger.info('[Auth] Signed out');
    }
  };
  return <AuthContext.Provider value={{ user, checking, login, logout }}>{children}</AuthContext.Provider>;
}
const useAuth = () => useContext(AuthContext);

function Button({ children, onPress, secondary = false }) { return <Pressable accessibilityRole="button" onPress={onPress} style={[styles.button, secondary && styles.buttonSecondary]}><Text style={[styles.buttonText, secondary && styles.buttonSecondaryText]}>{children}</Text></Pressable>; }
function Screen({ children, onRefresh, refreshing }) { return <SafeAreaView style={styles.safe} edges={['top']}><ScrollView contentContainerStyle={styles.content} refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.teal} /> : undefined}>{children}</ScrollView></SafeAreaView>; }
function Header({ eyebrow, title, subtitle }) { return <View style={styles.header}><Text style={styles.eyebrow}>{eyebrow}</Text><Text style={styles.title}>{title}</Text>{subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}</View>; }
function Card({ children }) { return <View style={styles.card}>{children}</View>; }
function Loading() { return <View style={styles.loading}><ActivityIndicator color={colors.teal} /></View>; }

function LoginScreen() { const { login } = useAuth(); const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [fieldError, setFieldError] = useState(''); const submit = async () => { const emailTrim = email.trim(); if (!emailTrim || !emailTrim.includes('@')) { setFieldError('Please enter a valid email address'); Alert.alert('Validation failed', 'Please enter a valid email address'); return; } if (!password || password.length < 6) { setFieldError('Password must be at least 6 characters'); Alert.alert('Validation failed', 'Password must be at least 6 characters'); return; } setFieldError(''); try { await login(email, password); Alert.alert('Welcome back!', 'You’re signed in — let’s keep building your pathway.'); } catch (error) { const msg = error.message || 'Unable to sign in'; const isRate = msg.toLowerCase().includes('too many') || msg.includes('429'); logger.warn('[Auth] Sign in failed:', msg); Alert.alert(isRate ? 'Too many attempts' : 'Unable to sign in', isRate ? 'Please wait a moment before trying again.' : msg); } }; return <SafeAreaView style={styles.login}><View><Text style={styles.brandMark}>CU</Text><Text style={styles.loginTitle}>Your next move is clear.</Text><Text style={styles.subtitle}>Build skills, find work, and move forward in Cebu.</Text><TextInput autoCapitalize="none" keyboardType="email-address" placeholder="Email address" value={email} onChangeText={(v) => { setEmail(v); if (fieldError) setFieldError(''); }} style={[styles.input, fieldError && styles.inputError]} /><TextInput secureTextEntry placeholder="Password" value={password} onChangeText={(v) => { setPassword(v); if (fieldError) setFieldError(''); }} style={[styles.input, fieldError && styles.inputError]} />{fieldError ? <Text style={styles.fieldError}>{fieldError}</Text> : null}<Button onPress={submit}>Sign in</Button></View></SafeAreaView>; }

function HomeScreen() { const { user } = useAuth(); const [stats, setStats] = useState(null); const [refreshing, setRefreshing] = useState(false); const load = (bypass = false) => request('/stats/week', bypass ? { bypassCache: true } : undefined).then(setStats).catch(() => setStats({ learningTimeHours: 0, coursesActive: 0, jobsWorthApplying: 0 })); useEffect(() => { load(); }, []); const refresh = async () => { setRefreshing(true); await load(true); setRefreshing(false); Alert.alert('Refreshed', 'Your pathway is up to date.'); }; return <SafeAreaView style={styles.safe} edges={['top']}><ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.teal} />}><Header eyebrow="MY PATHWAY" title={`Hi, ${user?.firstName || 'Learner'}.`} subtitle="Keep closing the gaps that matter most." /><Card><Text style={styles.cardEyebrow}>THIS WEEK</Text><Text style={styles.cardTitle}>Small steps add up.</Text><Text style={styles.cardText}>Keep your pathway moving with focused learning and timely applications.</Text><Button secondary onPress={() => Alert.alert('Pathway', 'Your pathway view is up to date — keep closing those gaps!')}>View pathway</Button></Card><View style={styles.stats}>{[['Learning', `${stats?.learningTimeHours || 0}h`], ['Active courses', stats?.coursesActive || 0], ['Jobs to explore', stats?.jobsWorthApplying || 0]].map(([label, value]) => <Card key={label}><Text style={styles.statValue}>{value}</Text><Text style={styles.statLabel}>{label}</Text></Card>)}</View></ScrollView></SafeAreaView>; }
function ListScreen({ title, endpoint, empty, renderItem }) { const [items, setItems] = useState(null); const [error, setError] = useState(''); const [retryKey, setRetryKey] = useState(0); const [refreshing, setRefreshing] = useState(false); const load = async (bypass = false) => { setError(''); try { const data = await request(endpoint, bypass ? { bypassCache: true } : undefined); setItems(Array.isArray(data) ? data : (data?.items ?? [])); } catch (err) { const msg = err?.message || 'Could not load content'; setError(msg); setItems([]); logger.warn(`[List] ${endpoint} failed:`, msg); } }; useEffect(() => { setItems(null); load(); }, [endpoint, retryKey]); const refresh = async () => { setRefreshing(true); await load(true); setRefreshing(false); }; if (!items) return <Screen><Loading /></Screen>; if (error) return <Screen onRefresh={refresh} refreshing={refreshing}><Header eyebrow="MY PATHWAY" title={title} subtitle="Your next best opportunities, in one place." /><Card><Text style={styles.cardTitle}>Couldn’t load {title.toLowerCase()}</Text><Text style={[styles.cardText, { color: '#b42318' }]}>{error.includes('429') || error.toLowerCase().includes('too many') ? 'Too many requests — please wait a moment and retry.' : error}</Text><Button secondary onPress={() => { setItems(null); setRetryKey((k) => k + 1); }}>Try again</Button></Card></Screen>; return <Screen onRefresh={refresh} refreshing={refreshing}><Header eyebrow="MY PATHWAY" title={title} subtitle="Your next best opportunities, in one place." />{items.length ? items.map(renderItem) : <Card><Text style={styles.cardTitle}>{empty}</Text><Text style={styles.cardText}>Check back soon as new opportunities are added.</Text></Card>}</Screen>; }
function SkillsScreen() { return <ListScreen title="Skill profile" endpoint="/skills" empty="No skills added yet." renderItem={(item, index) => <Card key={item.skillId || index}><Text style={styles.cardTitle}>{item.name || item.skillName}</Text><Text style={styles.cardText}>Current level: {item.level || item.currentLevel || 'Not assessed'}</Text></Card>} />; }
function CompanyLogo({ name, url, size = 42 }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => { setFailed(false); }, [url]);
  if (!url || failed) {
    const words = (name || '').trim().split(/\s+/).filter(Boolean);
    const initials = words.length === 0 ? '?' : words.length === 1 ? words[0].slice(0, 2) : `${words[0][0]}${words[1][0]}`;
    return <View style={[styles.logoFallback, { width: size, height: size }]}><Text style={{ color: colors.teal, fontWeight: '800', fontSize: size * 0.34 }}>{initials.toUpperCase()}</Text></View>;
  }
  // `cache: 'force-cache'` uses the native image cache on iOS (Android
  // already caches via the networking layer). For full disk+memory caching
  // with cache policies, swap this for `expo-image`
  // (`npx expo install expo-image`, then `import { Image } from 'expo-image'`).
  return <Image source={{ uri: url, cache: 'force-cache' }} style={{ width: size, height: size, borderRadius: 10, backgroundColor: colors.soft }} onError={() => setFailed(true)} accessibilityLabel={`${name} logo`} />;
}

function JobsScreen() {
  const [selectedCompanyId, setSelectedCompanyId] = useState(null);
  return selectedCompanyId == null
    ? <JobsListScreen onOpenCompany={setSelectedCompanyId} />
    : <CompanyDetailScreen companyId={selectedCompanyId} onClose={() => setSelectedCompanyId(null)} />;
}

function JobsListScreen({ onOpenCompany }) {
  return <ListScreen title="Find work" endpoint="/posts" empty="No matching jobs yet." renderItem={(item, index) => (
    <Card key={item.postId || item.jobId || index}>
      <View style={styles.cardHeaderRow}>
        <CompanyLogo name={item.companyName || item.company} url={item.companyLogoUrl} />
        <View style={{ flex: 1 }}>
          <Text style={styles.cardEyebrow}>{item.location || 'CEBU'}</Text>
          <Text style={styles.cardTitle}>{item.title || item.jobTitle}</Text>
        </View>
      </View>
      {(item.companyName || item.company) && (
        <Pressable onPress={() => item.companyId != null && onOpenCompany(item.companyId)} disabled={item.companyId == null}>
          <Text style={[styles.cardText, item.companyId != null && styles.companyLink]}>
            {item.companyName || item.company}{item.companyIndustry || item.industry ? ` · ${item.companyIndustry || item.industry}` : ''}{item.companySize ? ` · ${item.companySize}` : ''}
          </Text>
        </Pressable>
      )}
      <Button secondary onPress={() => Alert.alert('Role saved', `${item.title || 'This role'} is saved to your applications.`)}>View role</Button>
    </Card>
  )} />;
}

function CompanyDetailScreen({ companyId, onClose }) {
  const [company, setCompany] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    Promise.all([request(`/companies/${companyId}`), request(`/companies/${companyId}/posts`).catch(() => ({ items: [] }))])
      .then(([c, p]) => { setCompany(c); setPosts(p?.items || []); })
      .catch(() => setCompany(null))
      .finally(() => setLoading(false));
  }, [companyId]);

  if (loading) return <Screen><Loading /></Screen>;
  if (!company) {
    return <Screen><Header eyebrow="COMPANY" title="Unavailable" subtitle="This company profile could not be loaded." /><Button secondary onPress={onClose}>Go back</Button></Screen>;
  }

  const meta = [company.industry, company.companySize ? `${company.companySize} employees` : '', company.location].filter(Boolean);

  return (
    <Screen>
      <Pressable onPress={onClose} accessibilityRole="button"><Text style={styles.backLink}>{'← Back to jobs'}</Text></Pressable>
      <Card>
        <View style={styles.cardHeaderRow}>
          <CompanyLogo name={company.name} url={company.logoUrl} size={56} />
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>{company.name}</Text>
            {meta.length > 0 && <Text style={styles.cardText}>{meta.join(' · ')}</Text>}
          </View>
        </View>
        {!!company.description && <Text style={styles.cardText}>{company.description}</Text>}
        {!!company.website && <Text style={styles.cardText}>{company.website.replace(/^https?:\/\//, '')}</Text>}
      </Card>
      <Text style={styles.sectionLabel}>OPEN ROLES</Text>
      {posts.length === 0 ? (
        <Card><Text style={styles.cardTitle}>No open roles right now</Text><Text style={styles.cardText}>Check back soon as new opportunities are added.</Text></Card>
      ) : posts.map((post, index) => (
        <Card key={post.postId || index}>
          <Text style={styles.cardTitle}>{post.title}</Text>
          <Text style={styles.cardText}>{[post.jobType, post.location].filter(Boolean).join(' · ')}</Text>
        </Card>
      ))}
    </Screen>
  );
}
function LearnScreen() { return <ListScreen title="Learn" endpoint="/courses" empty="No courses available." renderItem={(item, index) => <Card key={item.courseId || index}><Text style={styles.cardEyebrow}>{item.mode || 'ONLINE'}</Text><Text style={styles.cardTitle}>{item.name || item.title}</Text><Text style={styles.cardText}>{item.description || 'Build a practical skill for your target role.'}</Text><Button secondary onPress={() => Alert.alert('Course opened', `${item.name || 'This course'} is ready — happy learning!`)}>Open course</Button></Card>} />; }
function ApplicationsScreen() { return <ListScreen title="Applications" endpoint="/applications" empty="No applications yet." renderItem={(item, index) => <Card key={item.applicationId || index}><Text style={styles.cardTitle}>{item.jobTitle || item.job?.title || 'Job application'}</Text><Text style={styles.cardText}>Status: {item.status || 'Submitted'}</Text></Card>} />; }
function AccountScreen() { const { user, logout } = useAuth(); const [company, setCompany] = useState(null); useEffect(() => { if (user?.companyId == null) return; let cancelled = false; request(`/companies/${user.companyId}`).then((c) => { if (!cancelled) setCompany(c); }).catch(() => {}); return () => { cancelled = true; }; }, [user?.companyId]); return <Screen><Header eyebrow="ACCOUNT" title="Your profile" subtitle="Keep your pathway details up to date." /><Card><Text style={styles.cardTitle}>{user?.firstName} {user?.lastName}</Text><Text style={styles.cardText}>{user?.emailAddress || user?.email}</Text><Text style={styles.cardText}>Target role: {user?.targetRole || 'Not set'}</Text>{company && <View style={{ marginTop: 10 }}><CompanyLogo name={company.name} url={company.logoUrl} size={40} /><Text style={styles.cardTitle}>{company.name}</Text><Text style={styles.cardText}>{[company.industry, company.companySize ? `${company.companySize} employees` : '', company.location].filter(Boolean).join(' · ') || 'Your company'}</Text></View>}</Card><Button secondary onPress={logout}>Sign out</Button></Screen>; }

const Tab = createBottomTabNavigator();
const tabOptions = { headerShown: false, tabBarActiveTintColor: colors.teal, tabBarInactiveTintColor: colors.muted, tabBarStyle: { height: 68, paddingBottom: 10, backgroundColor: colors.surface, borderTopColor: colors.line }, tabBarLabelStyle: { fontSize: 11 } };
function AppTabs() { return <Tab.Navigator screenOptions={tabOptions}><Tab.Screen name="Home" component={HomeScreen} options={{ tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" color={color} size={size} /> }} /><Tab.Screen name="Skills" component={SkillsScreen} options={{ tabBarIcon: ({ color, size }) => <Ionicons name="sparkles-outline" color={color} size={size} /> }} /><Tab.Screen name="Jobs" component={JobsScreen} options={{ tabBarIcon: ({ color, size }) => <Ionicons name="briefcase-outline" color={color} size={size} /> }} /><Tab.Screen name="Learn" component={LearnScreen} options={{ tabBarIcon: ({ color, size }) => <Ionicons name="book-outline" color={color} size={size} /> }} /><Tab.Screen name="Applications" component={ApplicationsScreen} options={{ tabBarIcon: ({ color, size }) => <Ionicons name="file-tray-outline" color={color} size={size} /> }} /><Tab.Screen name="Account" component={AccountScreen} options={{ tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" color={color} size={size} /> }} /></Tab.Navigator>; }
function NativeApp() { const { user, checking } = useAuth(); if (checking) return <Loading />; return user ? <AppTabs /> : <LoginScreen />; }
export default function App() { return <SafeAreaProvider><AuthProvider><NavigationContainer theme={{ ...DefaultTheme, colors: { ...DefaultTheme.colors, background: colors.bg } }}><NativeApp /></NavigationContainer></AuthProvider></SafeAreaProvider>; }

const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: colors.bg }, content: { padding: 20, gap: 16 }, header: { gap: 8, marginBottom: 8 }, eyebrow: { color: colors.coral, fontSize: 11, fontWeight: '700', letterSpacing: 1.3 }, title: { color: colors.ink, fontSize: 34, fontWeight: '800', letterSpacing: -1 }, subtitle: { color: colors.muted, fontSize: 15, lineHeight: 23 }, card: { backgroundColor: colors.surface, borderColor: colors.line, borderWidth: 1, borderRadius: 18, padding: 18, gap: 8 }, cardEyebrow: { color: colors.coral, fontSize: 10, fontWeight: '800', letterSpacing: 1.2 }, cardTitle: { color: colors.ink, fontSize: 19, fontWeight: '800' }, cardText: { color: colors.muted, lineHeight: 21 }, cardHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 12 }, logoFallback: { borderRadius: 10, backgroundColor: colors.soft, alignItems: 'center', justifyContent: 'center' }, companyLink: { color: colors.teal, fontWeight: '700', textDecorationLine: 'underline' }, backLink: { color: colors.teal, fontWeight: '700', fontSize: 14 }, sectionLabel: { color: colors.coral, fontSize: 11, fontWeight: '800', letterSpacing: 1.3 }, button: { backgroundColor: colors.teal, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 8 }, buttonSecondary: { backgroundColor: colors.soft }, buttonText: { color: colors.surface, fontWeight: '800' }, buttonSecondaryText: { color: colors.teal }, stats: { flexDirection: 'row', gap: 10 }, statValue: { color: colors.teal, fontSize: 24, fontWeight: '800' }, statLabel: { color: colors.muted, fontSize: 12 }, loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }, login: { flex: 1, justifyContent: 'center', backgroundColor: colors.bg, padding: 24 }, brandMark: { color: colors.surface, backgroundColor: colors.coral, alignSelf: 'flex-start', padding: 10, borderRadius: 12, fontWeight: '800', marginBottom: 24 }, loginTitle: { color: colors.ink, fontSize: 40, fontWeight: '800', letterSpacing: -1.5, marginBottom: 10 }, input: { backgroundColor: colors.surface, borderColor: colors.line, borderWidth: 1, borderRadius: 12, padding: 15, marginTop: 12, color: colors.ink }, inputError: { borderColor: '#b42318', backgroundColor: '#fef2f2' }, fieldError: { color: '#b42318', fontSize: 12, fontWeight: '700', marginTop: 6 } });
