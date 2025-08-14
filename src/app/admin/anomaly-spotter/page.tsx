import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AnomalyDetector } from "@/components/admin/anomaly-detector";

export default function AnomalySpotterPage() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>AI-Powered Anomaly Spotter</CardTitle>
          <CardDescription>
            Describe user activities during or after a booking to detect potential irregularities, fraud, or other issues.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AnomalyDetector />
        </CardContent>
      </Card>
    </div>
  );
}
