import SiteChrome from "@/components/seo/SiteChrome";
import StateScreen from "@/components/seo/StateScreen";
import { ActionLink } from "@/components/seo/blocks";

export default function NotFound() {
  return (
    <SiteChrome>
      <StateScreen
        code="404"
        title="Nothing at this address"
        actions={
          <>
            <ActionLink href="/" variant="primary" large>
              Back to search
            </ActionLink>
            <ActionLink href="/explore" large>
              Explore guides
            </ActionLink>
          </>
        }
      >
        <p>The page, report or repository link may have expired, moved, or never existed.</p>
      </StateScreen>
    </SiteChrome>
  );
}
