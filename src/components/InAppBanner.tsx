import { detectInAppBrowser, openInChrome } from '../lib/inAppBrowser';
import { BigButton } from './BigButton';

export function InAppBanner() {
  const app = detectInAppBrowser();
  if (!app) return null;
  return (
    <div className="inapp-banner" role="alert">
      <p>
        ⚠️ 지금 <strong>{app}</strong> 안에서 열려 있어요.
        <br />
        여기서 기록하면 <strong>크롬·홈 화면 앱에는 안 보여요.</strong>
      </p>
      <BigButton variant="primary" onClick={() => openInChrome()}>
        크롬으로 열기
      </BigButton>
    </div>
  );
}
