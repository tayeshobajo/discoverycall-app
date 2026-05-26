import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default async function EmbedPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: host } = await supabase
    .from('hosts')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!host) redirect('/onboarding');

  const { data: agent } = await supabase
    .from('agents')
    .select('embed_token, display_name')
    .eq('id', id)
    .eq('host_id', host.id)
    .maybeSingle();

  if (!agent) notFound();

  const embedCode = `<!-- DiscoveryCall — ${agent.display_name} -->
<script src="https://embed.discoverycall.ai/loader.js"
  data-token="${agent.embed_token}"
  async></script>`;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Embed code</h1>
        <p className="text-gray-500 text-sm mt-1">Add this to your website to activate {agent.display_name}.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Copy this code</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-900 rounded-lg p-4 mb-3">
            <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap">{embedCode}</pre>
          </div>
          <p className="text-xs text-gray-400">
            Paste before the closing <code>&lt;/body&gt;</code> tag on every page where you want the agent to appear.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Installation guides</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { platform: 'WordPress', steps: ['Go to Appearance → Theme Editor (or use Insert Headers and Footers plugin)', 'Paste the code before </body>', 'Save'] },
            { platform: 'Webflow', steps: ['Go to Project Settings → Custom Code', 'Paste in "Footer Code" section', 'Publish your site'] },
            { platform: 'Squarespace', steps: ['Go to Settings → Advanced → Code Injection', 'Paste in "Footer" section', 'Save'] },
            { platform: 'Shopify', steps: ['Go to Online Store → Themes → Edit code', 'Open theme.liquid', 'Paste before </body>'] },
            { platform: 'HTML', steps: ['Open your HTML file', 'Paste before the closing </body> tag', 'Save and deploy'] },
          ].map((guide) => (
            <div key={guide.platform} className="border rounded-lg p-4">
              <p className="text-sm font-medium text-gray-900 mb-2">{guide.platform}</p>
              <ol className="space-y-1">
                {guide.steps.map((step, i) => (
                  <li key={i} className="text-xs text-gray-500 flex gap-2">
                    <span className="font-medium text-gray-400">{i + 1}.</span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
