import { App } from '@/components/App';
import { ThemeProvider } from '@/components/ThemeProvider';

export default function Page() {
  return (
    <ThemeProvider>
      <App />
    </ThemeProvider>
  );
}
