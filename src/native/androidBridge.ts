import { App as CapApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { useEffect, useLayoutEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAppStore } from '@/stores/useAppStore';

const tabs = new Set(['/library', '/practice', '/bank']);
const backIntervalMs = 2000;

async function configureStatusBar() {
  await StatusBar.setOverlaysWebView({ overlay: false });
  await StatusBar.setBackgroundColor({ color: '#F5F7FA' });
  await StatusBar.setStyle({ style: Style.Light });
}

function dismissDialog(): boolean {
  const dialogs = document.querySelectorAll<HTMLDialogElement>('dialog[open]');
  const dialog = dialogs[dialogs.length - 1];
  if (!dialog) return false;

  // Let React update the state that owns the dialog before using the DOM fallback.
  if (dialog.dispatchEvent(new Event('cancel', { cancelable: true }))) dialog.close();
  return true;
}

function parentPage(path: string): string {
  if (path.startsWith('/library/confusion/')) return '/library?tab=confusion';
  if (path.startsWith('/library/')) return '/library';
  if (path.startsWith('/quiz/') || path.startsWith('/practice/')) return '/practice';
  if (path === '/settings/api') return '/settings';
  if (path === '/settings') return '/bank';
  return '/';
}

export function AndroidBridge() {
  const location = useLocation();
  const navigate = useNavigate();
  const route = useRef({ location, navigate });
  const lastPress = useRef<{ key: string; time: number }>();

  useLayoutEffect(() => {
    route.current = { location, navigate };
    lastPress.current = undefined;
  }, [location, navigate]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') return;

    let active = true;
    void configureStatusBar().catch((error: unknown) => console.warn('Android 状态栏配置失败', error));

    const listener = CapApp.addListener('backButton', ({ canGoBack }) => {
      if (!active) return;
      if (dismissDialog()) {
        lastPress.current = undefined;
        return;
      }

      const { location, navigate } = route.current;
      const path = location.pathname.replace(/\/+$/, '') || '/';
      const inQuiz = /^\/quiz\/[^/]+$/.test(path);

      if (path === '/' || inQuiz) {
        const now = performance.now();
        if (lastPress.current?.key === location.key && now - lastPress.current.time <= backIntervalMs) {
          lastPress.current = undefined;
          if (inQuiz) {
            navigate('/practice', { replace: true });
          } else {
            void CapApp.exitApp().catch((error: unknown) => console.warn('Android 退出失败', error));
          }
          return;
        }
        lastPress.current = { key: location.key, time: now };
        useAppStore.getState().showToast({
          message: inQuiz ? '答题进度已自动保存，再按一次退出答题' : '再按一次退出应用',
        });
        return;
      }

      lastPress.current = undefined;
      if (tabs.has(path)) {
        navigate('/', { replace: true });
      } else if (canGoBack && window.history.state?.idx > 0) {
        window.history.back();
      } else {
        navigate(parentPage(path), { replace: true });
      }
    });

    void listener.catch((error: unknown) => console.warn('Android 返回键注册失败', error));

    return () => {
      active = false;
      void listener.then((handle) => handle.remove()).catch(() => {});
    };
  }, []);

  return null;
}
