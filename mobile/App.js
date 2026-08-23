import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { logger } from './logger';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api';
const colors = { bg: '#e8f0ee', surface: '#f5faf8', ink: '#1a2e27', muted: '#5c7a6e', line: '#c4d6cd', teal: '#1a6b5a', coral: '#d4775c', soft: '#c6e6df' };

async function request(path, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  logger.debug(`[API] ${method} ${path}`);
  try {
    const token = await SecureStore.getItemAsync('token');
    const response = await fetch(`${API_URL}${path}`, { ...options, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers } });
    const data = response.status === 204 ? null : await response.json();
    if (!response.ok) {
      logger.warn(`[API] ${method} ${path} → ${response.status}: ${data?.error || ''}`);
      throw new Error(data?.error || `Request failed (${response.status})`);
    }
    logger.debug(`[API] ${method} ${path} → ${response.status}`);
    return data;
  } catch (error) {
    logger.error(`[API] ${method} ${path} → network error`, error?.message || error);
    throw error;
  }
}

const AuthContext = createContext(null);
function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);
  useEffect(() => { SecureStore.getItemAsync('user').then((value) => { if (value) { setUser(JSON.parse(value)); logger.info('[Auth] Session restored from secure storage'); } else { logger.debug('[Auth] No stored session'); } }).catch((error) => logger.warn('[Auth] Failed to restore session:', error?.message || error)).finally(() => setChecking(false)); }, []);
  const login = async (email, password) => { const data = await request('/auth/login', { method: 'POST', body: JSON.stringify({ emailAddress: email, password }) }); await SecureStore.setItemAsync('token', data.token); await SecureStore.setItemAsync('user', JSON.stringify(data)); setUser(data); logger.info(`[Auth] Signed in as ${data.emailAddress || data.email}`); };
  const logout = async () => { await SecureStore.deleteItemAsync('token'); await SecureStore.deleteItemAsync('user'); setUser(null); logger.info('[Auth] Signed out'); };
  return <AuthContext.Provider value={{ user, checking, login, logout }}>{children}</AuthContext.Provider>;
}
const useAuth = () => useContext(AuthContext);

function Button({ children, onPress, secondary = false }) { return <Pressable accessibilityRole="button" onPress={onPress} style={[styles.button, secondary && styles.buttonSecondary]}><Text style={[styles.buttonText, secondary && styles.buttonSecondaryText]}>{children}</Text></Pressable>; }
function Screen({ children }) { return <SafeAreaView style={styles.safe} edges={['top']}><ScrollView contentContainerStyle={styles.content} refreshControl={undefined}>{children}</ScrollView></SafeAreaView>; }
function Header({ eyebrow, title, subtitle }) { return <View style={styles.header}><Text style={styles.eyebrow}>{eyebrow}</Text><Text style={styles.title}>{title}</Text>{subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}</View>; }
function Card({ children }) { return <View style={styles.card}>{children}</View>; }
function Loading() { return <View style={styles.loading}><ActivityIndicator color={colors.teal} /></View>; }

function LoginScreen() { const { login } = useAuth(); const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const submit = async () => { try { await login(email, password); } catch (error) { logger.warn('[Auth] Sign in failed:', error?.message || error); Alert.alert('Unable to sign in', error.message); } }; return <SafeAreaView style={styles.login}><View><Text style={styles.brandMark}>CU</Text><Text style={styles.loginTitle}>Your next move is clear.</Text><Text style={styles.subtitle}>Build skills, find work, and move forward in Cebu.</Text><TextInput autoCapitalize="none" keyboardType="email-address" placeholder="Email address" value={email} onChangeText={setEmail} style={styles.input} /><TextInput secureTextEntry placeholder="Password" value={password} onChangeText={setPassword} style={styles.input} /><Button onPress={submit}>Sign in</Button></View></SafeAreaView>; }

function HomeScreen() { const { user } = useAuth(); const [stats, setStats] = useState(null); const [refreshing, setRefreshing] = useState(false); const load = () => request('/stats/week').then(setStats).catch(() => setStats({ learningTimeHours: 0, coursesActive: 0, jobsWorthApplying: 0 })); useEffect(load, []); const refresh = async () => { setRefreshing(true); await load(); setRefreshing(false); }; return <SafeAreaView style={styles.safe} edges={['top']}><ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.teal} />}><Header eyebrow="MY PATHWAY" title={`Hi, ${user?.firstName || 'Learner'}.`} subtitle="Keep closing the gaps that matter most." /><Card><Text style={styles.cardEyebrow}>THIS WEEK</Text><Text style={styles.cardTitle}>Small steps add up.</Text><Text style={styles.cardText}>Keep your pathway moving with focused learning and timely applications.</Text><Button secondary onPress={() => {}}>View pathway</Button></Card><View style={styles.stats}>{[['Learning', `${stats?.learningTimeHours || 0}h`], ['Active courses', stats?.coursesActive || 0], ['Jobs to explore', stats?.jobsWorthApplying || 0]].map(([label, value]) => <Card key={label}><Text style={styles.statValue}>{value}</Text><Text style={styles.statLabel}>{label}</Text></Card>)}</View></ScrollView></SafeAreaView>; }
function ListScreen({ title, endpoint, empty, renderItem }) { const [items, setItems] = useState(null); useEffect(() => { request(endpoint).then(setItems).catch(() => setItems([])); }, [endpoint]); if (!items) return <Screen><Loading /></Screen>; return <Screen><Header eyebrow="MY PATHWAY" title={title} subtitle="Your next best opportunities, in one place." />{items.length ? items.map(renderItem) : <Card><Text style={styles.cardTitle}>{empty}</Text><Text style={styles.cardText}>Check back soon as new opportunities are added.</Text></Card>}</Screen>; }
function SkillsScreen() { return <ListScreen title="Skill profile" endpoint="/skills" empty="No skills added yet." renderItem={(item, index) => <Card key={item.skillId || index}><Text style={styles.cardTitle}>{item.name || item.skillName}</Text><Text style={styles.cardText}>Current level: {item.level || item.currentLevel || 'Not assessed'}</Text></Card>} />; }
function CompanyLogo({ name, url, size = 42 }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => { setFailed(false); }, [url]);
  if (!url || failed) {
    const words = (name || '').trim().split(/\s+/).filter(Boolean);
    const initials = words.length === 0 ? '?' : words.length === 1 ? words[0].slice(0, 2) : `${words[0][0]}${words[1][0]}`;
    return <View style={[styles.logoFallback, { width: size, height: size }]}><Text style={{ color: colors.teal, fontWeight: '800', fontSize: size * 0.34 }}>{initials.toUpperCase()}</Text></View>;
  }
  return <Image source={{ uri: url }} style={{ width: size, height: size, borderRadius: 10, backgroundColor: colors.soft }} onError={() => setFailed(true)} accessibilityLabel={`${name} logo`} />;
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
            {item.companyName || item.company}{item.industry ? ` · ${item.industry}` : ''}{item.companySize ? ` · ${item.companySize}` : ''}
          </Text>
        </Pressable>
      )}
      <Button secondary onPress={() => {}}>View role</Button>
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
function LearnScreen() { return <ListScreen title="Learn" endpoint="/courses" empty="No courses available." renderItem={(item, index) => <Card key={item.courseId || index}><Text style={styles.cardEyebrow}>{item.mode || 'ONLINE'}</Text><Text style={styles.cardTitle}>{item.name || item.title}</Text><Text style={styles.cardText}>{item.description || 'Build a practical skill for your target role.'}</Text><Button secondary onPress={() => {}}>Open course</Button></Card>} />; }
function ApplicationsScreen() { return <ListScreen title="Applications" endpoint="/applications" empty="No applications yet." renderItem={(item, index) => <Card key={item.applicationId || index}><Text style={styles.cardTitle}>{item.jobTitle || item.job?.title || 'Job application'}</Text><Text style={styles.cardText}>Status: {item.status || 'Submitted'}</Text></Card>} />; }
function AccountScreen() { const { user, logout } = useAuth(); const [company, setCompany] = useState(null); useEffect(() => { if (user?.companyId == null) return; let cancelled = false; request(`/companies/${user.companyId}`).then((c) => { if (!cancelled) setCompany(c); }).catch(() => {}); return () => { cancelled = true; }; }, [user?.companyId]); return <Screen><Header eyebrow="ACCOUNT" title="Your profile" subtitle="Keep your pathway details up to date." /><Card><Text style={styles.cardTitle}>{user?.firstName} {user?.lastName}</Text><Text style={styles.cardText}>{user?.emailAddress || user?.email}</Text><Text style={styles.cardText}>Target role: {user?.targetRole || 'Not set'}</Text>{company && <View style={{ marginTop: 10 }}><CompanyLogo name={company.name} url={company.logoUrl} size={40} /><Text style={styles.cardTitle}>{company.name}</Text><Text style={styles.cardText}>{[company.industry, company.companySize ? `${company.companySize} employees` : '', company.location].filter(Boolean).join(' · ') || 'Your company'}</Text></View>}</Card><Button secondary onPress={logout}>Sign out</Button></Screen>; }

const Tab = createBottomTabNavigator();
const tabOptions = { headerShown: false, tabBarActiveTintColor: colors.teal, tabBarInactiveTintColor: colors.muted, tabBarStyle: { height: 68, paddingBottom: 10, backgroundColor: colors.surface, borderTopColor: colors.line }, tabBarLabelStyle: { fontSize: 11 } };
function AppTabs() { return <Tab.Navigator screenOptions={tabOptions}><Tab.Screen name="Home" component={HomeScreen} options={{ tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" color={color} size={size} /> }} /><Tab.Screen name="Skills" component={SkillsScreen} options={{ tabBarIcon: ({ color, size }) => <Ionicons name="sparkles-outline" color={color} size={size} /> }} /><Tab.Screen name="Jobs" component={JobsScreen} options={{ tabBarIcon: ({ color, size }) => <Ionicons name="briefcase-outline" color={color} size={size} /> }} /><Tab.Screen name="Learn" component={LearnScreen} options={{ tabBarIcon: ({ color, size }) => <Ionicons name="book-outline" color={color} size={size} /> }} /><Tab.Screen name="Account" component={AccountScreen} options={{ tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" color={color} size={size} /> }} /></Tab.Navigator>; }
function NativeApp() { const { user, checking } = useAuth(); if (checking) return <Loading />; return user ? <AppTabs /> : <LoginScreen />; }
export default function App() { return <SafeAreaProvider><AuthProvider><NavigationContainer theme={{ ...DefaultTheme, colors: { ...DefaultTheme.colors, background: colors.bg } }}><NativeApp /></NavigationContainer></AuthProvider></SafeAreaProvider>; }

const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: colors.bg }, content: { padding: 20, gap: 16 }, header: { gap: 8, marginBottom: 8 }, eyebrow: { color: colors.coral, fontSize: 11, fontWeight: '700', letterSpacing: 1.3 }, title: { color: colors.ink, fontSize: 34, fontWeight: '800', letterSpacing: -1 }, subtitle: { color: colors.muted, fontSize: 15, lineHeight: 23 }, card: { backgroundColor: colors.surface, borderColor: colors.line, borderWidth: 1, borderRadius: 18, padding: 18, gap: 8 }, cardEyebrow: { color: colors.coral, fontSize: 10, fontWeight: '800', letterSpacing: 1.2 }, cardTitle: { color: colors.ink, fontSize: 19, fontWeight: '800' }, cardText: { color: colors.muted, lineHeight: 21 }, cardHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 12 }, logoFallback: { borderRadius: 10, backgroundColor: colors.soft, alignItems: 'center', justifyContent: 'center' }, companyLink: { color: colors.teal, fontWeight: '700', textDecorationLine: 'underline' }, backLink: { color: colors.teal, fontWeight: '700', fontSize: 14 }, sectionLabel: { color: colors.coral, fontSize: 11, fontWeight: '800', letterSpacing: 1.3 }, button: { backgroundColor: colors.teal, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 8 }, buttonSecondary: { backgroundColor: colors.soft }, buttonText: { color: colors.surface, fontWeight: '800' }, buttonSecondaryText: { color: colors.teal }, stats: { flexDirection: 'row', gap: 10 }, statValue: { color: colors.teal, fontSize: 24, fontWeight: '800' }, statLabel: { color: colors.muted, fontSize: 12 }, loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }, login: { flex: 1, justifyContent: 'center', backgroundColor: colors.bg, padding: 24 }, brandMark: { color: colors.surface, backgroundColor: colors.coral, alignSelf: 'flex-start', padding: 10, borderRadius: 12, fontWeight: '800', marginBottom: 24 }, loginTitle: { color: colors.ink, fontSize: 40, fontWeight: '800', letterSpacing: -1.5, marginBottom: 10 }, input: { backgroundColor: colors.surface, borderColor: colors.line, borderWidth: 1, borderRadius: 12, padding: 15, marginTop: 12, color: colors.ink } });
