import { useRef, useState, type ChangeEvent } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { analyzeEmail, type AnalysisResult } from "@/lib/api"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { IpLocationMap } from "@/components/IpLocationMap"

function authBadgeVariant(
  result: string
): "default" | "destructive" | "secondary" {
  if (result === "pass") return "default"
  if (result === "fail" || result === "softfail") return "destructive"
  return "secondary"
}

function riskColor(risk: string): string {
  if (risk === "high") return "text-red-500"
  if (risk === "medium") return "text-yellow-500"
  return "text-green-500"
}

export default function App() {
  const [file, setFile] = useState<File | null>(null)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    setFile(e.target.files?.[0] ?? null)
    setResult(null)
    setError(null)
  }

  const handleAnalyze = async () => {
    if (!file) return
    setLoading(true)
    setError(null)
    try {
      const data = await analyzeEmail(file)
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  return (
    // min-h-screen + bg-background here is the actual fix: without an
    // explicit height, the theme's background color only paints behind
    // the content, not the full viewport — everything below/around it
    // falls back to the browser's default background instead.
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-2xl space-y-6 px-4 pt-10 pb-16">
        <div>
          <h1 className="text-2xl font-bold">Email Forensics</h1>
          <p className="text-sm text-muted-foreground">
            Upload a .eml file to check authentication and trace its relay path.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Field className="flex-1">
            <FieldLabel htmlFor="eml-file">Email file</FieldLabel>
            {/* Native file inputs render their button using the OS's own
                light/dark theme, not your app's CSS — that's what caused
                the "switches strangely" look. Hiding the real input and
                triggering it via a normal styled Button fixes that,
                since the Button IS themed by your CSS like everything else. */}
            <input
              id="eml-file"
              ref={fileInputRef}
              type="file"
              accept=".eml"
              onChange={handleFileChange}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="w-full justify-start font-normal"
            >
              {file ? file.name : "Choose .eml file..."}
            </Button>
            <FieldDescription>
              Export an email as .eml (Gmail: "Show original" → "Download Original").
            </FieldDescription>
          </Field>
          <Button onClick={handleAnalyze} disabled={!file || loading}>
            {loading ? "Analyzing..." : "Analyze"}
          </Button>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {result && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {result.headers.subject || "(no subject)"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm text-muted-foreground">
                <div>From: {result.headers.from}</div>
                <div>Reply-To: {result.headers.reply_to || "—"}</div>
                <div>Return-Path: {result.headers.return_path || "—"}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-base">
                  Authentication
                  <span
                    className={`text-sm font-semibold uppercase ${riskColor(result.authentication.risk_level)}`}
                  >
                    {result.authentication.risk_level} risk
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex gap-2">
                <Badge variant={authBadgeVariant(result.authentication.spf)}>
                  SPF: {result.authentication.spf}
                </Badge>
                <Badge variant={authBadgeVariant(result.authentication.dkim)}>
                  DKIM: {result.authentication.dkim}
                </Badge>
                <Badge variant={authBadgeVariant(result.authentication.dmarc)}>
                  DMARC: {result.authentication.dmarc}
                </Badge>
              </CardContent>
            </Card>

            {result.red_flags.length > 0 && (
              <Alert variant="destructive">
                <AlertTitle>Red flags</AlertTitle>
                <AlertDescription>
                  <ul className="list-inside list-disc space-y-1">
                    {result.red_flags.map((flag, i) => (
                      <li key={i}>{flag}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Probable origin IP</CardTitle>
              </CardHeader>
              <CardContent>
                {result.probable_origin_ips.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {result.probable_origin_ips.map((ip) => (
                      <Badge key={ip} variant="outline">
                        {ip}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">
                    No IP found in relay chain
                  </span>
                )}
              </CardContent>
            </Card>

            {result.geolocation.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Geolocation</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {result.geolocation.map((geo) =>
                    geo.status === "success" ? (
                      <div key={geo.query} className="space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline">{geo.query}</Badge>
                          <span className="text-sm">
                            {[geo.city, geo.regionName, geo.country]
                              .filter(Boolean)
                              .join(", ")}
                          </span>
                          {geo.hosting && (
                            <Badge variant="secondary">hosting/datacenter</Badge>
                          )}
                          {geo.proxy && (
                            <Badge variant="destructive">proxy/VPN</Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {geo.org || geo.isp}
                        </div>
                        {geo.lat != null && geo.lon != null && (
                          <IpLocationMap
                            lat={geo.lat}
                            lon={geo.lon}
                            label={`${geo.query} — ${geo.org || geo.isp || "Unknown"}`}
                          />
                        )}
                      </div>
                    ) : (
                      <div key={geo.query} className="text-sm text-muted-foreground">
                        Could not geolocate {geo.query}: {geo.message}
                      </div>
                    )
                  )}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Relay chain ({result.relay_chain.length} hops)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {result.relay_chain.map((hop) => (
                  <div
                    key={hop.hop}
                    className="border-l-2 border-muted pl-3 text-sm"
                  >
                    <div className="font-medium">
                      Hop {hop.hop}
                      {hop.ip_candidates.length > 0 && (
                        <span className="ml-2 text-muted-foreground">
                          ({hop.ip_candidates.join(", ")})
                        </span>
                      )}
                    </div>
                    <div className="text-xs break-all text-muted-foreground">
                      {hop.raw}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
