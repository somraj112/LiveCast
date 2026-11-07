import { Card } from "@streamline/ui";
import ComponentPreview from "../_components/ComponentPreview";
export default function CardShowcase() {
  return (
    <ComponentPreview title="Surfaces">
      <Card border shadow={false} className="p-4">
        <span className="eyebrow">Channel 01 / Music</span>
        <h4 className="text-2xl font-bold tracking-tight mt-3">
          After Hours Radio
        </h4>
        <p className="text-sm mt-1">Studio Meridian’s vinyl listening room.</p>
      </Card>
    </ComponentPreview>
  );
}
