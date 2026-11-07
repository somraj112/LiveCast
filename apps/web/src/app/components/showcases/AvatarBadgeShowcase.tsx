import { Avatar, Badge } from "@streamline/ui";
import ComponentPreview from "../_components/ComponentPreview";
export default function AvatarBadgeShowcase() {
  return (
    <ComponentPreview title="Identity & status">
      <div className="flex items-center gap-3 flex-wrap">
        <Avatar size="xs" alt="Studio Meridian" fallback="SM" />
        <Avatar size="sm" alt="Mira Sol" fallback="MS" />
        <Avatar size="md" alt="Dev Frequency" fallback="DF" />
        <Avatar size="lg" alt="Echo Archive" fallback="EA" />
      </div>
      <div className="flex gap-2 flex-wrap mt-4">
        <Badge variant="live">On air</Badge>
        <Badge>Replay</Badge>
        <Badge variant="success">Creator</Badge>
        <Badge variant="danger">Restricted</Badge>
      </div>
    </ComponentPreview>
  );
}
