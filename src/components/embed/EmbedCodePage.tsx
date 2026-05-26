'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Copy, Check, ExternalLink, Play } from 'lucide-react';

interface EmbedAgent {
  id: string;
  embed_token: string;
  display_name: string;
  status: string;
}

const INSTALL_GUIDES = [
  {
    platform: 'WordPress',
    steps: [
      'Install the "Insert Headers and Footers" plugin (or use your theme editor)',
      'Go to Settings → Insert Headers and Footers',
      'Paste the code in the "Scripts in Footer" section',
      'Save changes. The widget will appear on all pages.',
    ],
    tip: 'Works with any WordPress theme including Elementor, Divi, and Avada.',
  },
  {
    platform: 'Webflow',
    steps: [
      'Open your project in Webflow',
      'Go to Project Settings → Custom Code',
      'Paste the embed code in the "Footer Code" section',
      'Publish your site to make it live',
    ],
    tip: 'The widget will appear on all published pages automatically.',
  },
  {
    platform: 'Squarespace',
    steps: [
      'Go to Settings → Advanced → Code Injection',
      'Paste the code in the "Footer" text area',
      'Click Save',
    ],
    tip: 'Available on Business plan and above.',
  },
  {
    platform: 'Shopify',
    steps: [
      'Go to Online Store → Themes',
      'Click Actions → Edit code on your active theme',
      'Open the theme.liquid file',
      'Paste the code just before the closing </body> tag',
      'Save file and your store is live',
    ],
    tip: 'Works on all Shopify themes.',
  },
  {
    platform: 'HTML',
    steps: [
      'Open your HTML file in a text editor',
      'Find the closing </body> tag near the bottom',
      'Paste the embed code just before </body>',
      'Save and deploy. Done.',
    ],
    tip: 'Works with any HTML site — static, Express, Laravel, Django, etc.',
  },
];

export default function EmbedCodePage({ agent }: { agent: EmbedAgent }) {
  const [activeTab, setActiveTab] = useState('WordPress');
  const [copied, setCopied] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const embedCode = `<!-- DiscoveryCall — ${agent.display_name} -->
<script src="https://embed.discoverycall.ai/loader.js"
  data-token="${agent.embed_token}"
  async></script>`;

  const copyCode = async () => {
    await navigator.clipboard.writeText(embedCode);
    setCopied(true);
    toast.success('Embed code copied!');
    setTimeout(() => setCopied(false), 2500);
  };

  const activeGuide = INSTALL_GUIDES.find(g => g.platform === activeTab)!;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Embed code</h1>
        <p className="text-gray-500 text-sm mt-1">
          Add this to your website to activate <strong>{agent.display_name}</strong>.
        </p>
      </div>

      {/* Embed code block */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Your embed script</CardTitle>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPreviewOpen(!previewOpen)}
                className="text-xs"
              >
                <Play className="w-3 h-3 mr-1" />
                Test agent
              </Button>
              <Button
                size="sm"
                onClick={copyCode}
                className={copied ? 'bg-green-600 hover:bg-green-700' : 'bg-[#1783F1] hover:bg-[#1468C8]'}
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 mr-1" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 mr-1" />
                    Copy code
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div
            className="bg-gray-900 rounded-lg p-4 cursor-pointer group relative"
            onClick={copyCode}
          >
            <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap leading-relaxed">
              {embedCode}
            </pre>
            <div className="absolute inset-0 bg-black/5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <span className="text-white text-sm font-medium bg-black/60 px-3 py-1 rounded-full">
                Click to copy
              </span>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-3">
            Paste before the closing{' '}
            <code className="bg-gray-100 px-1 rounded text-gray-600">&lt;/body&gt;</code> tag on
            every page where you want the widget to appear.
          </p>
        </CardContent>
      </Card>

      {/* Test widget preview */}
      {previewOpen && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                <Play className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-blue-900 mb-1">Test your agent</p>
                <p className="text-sm text-blue-700 mb-3">
                  Open your agent in a sandbox to test it before going live.
                </p>
                <a
                  href={`https://embed.discoverycall.ai/preview/${agent.embed_token}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                    <ExternalLink className="w-3.5 h-3.5 mr-1" />
                    Open preview
                  </Button>
                </a>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Installation guides */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Installation guide</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Tab navigation */}
          <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1">
            {INSTALL_GUIDES.map(guide => (
              <button
                key={guide.platform}
                onClick={() => setActiveTab(guide.platform)}
                className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${
                  activeTab === guide.platform
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {guide.platform}
              </button>
            ))}
          </div>

          {/* Active guide */}
          <div className="space-y-4">
            <ol className="space-y-3">
              {activeGuide.steps.map((step, i) => (
                <li key={i} className="flex gap-3">
                  <span className="w-6 h-6 bg-blue-100 text-blue-700 rounded-full text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <p className="text-sm text-gray-700 leading-relaxed">{step}</p>
                </li>
              ))}
            </ol>
            {activeGuide.tip && (
              <div className="bg-gray-50 rounded-lg px-4 py-3 border border-gray-200">
                <p className="text-xs text-gray-500">
                  <strong className="text-gray-700">Tip:</strong> {activeGuide.tip}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Need help */}
      <div className="text-center py-2">
        <p className="text-sm text-gray-400">
          Need help?{' '}
          <a
            href="mailto:support@discoverycall.ai"
            className="text-blue-500 hover:underline"
          >
            Email support@discoverycall.ai
          </a>
        </p>
      </div>
    </div>
  );
}
