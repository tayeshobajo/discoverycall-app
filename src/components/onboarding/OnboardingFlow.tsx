'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { Host, OnboardingStep } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Bot, Globe, FileText, Palette, Code2, CheckCircle2, ArrowRight } from 'lucide-react';

const STEPS = [
  { id: 'welcome', label: 'Welcome', icon: Bot },
  { id: 'connect_google', label: 'Connect Google', icon: Globe },
  { id: 'build_agent', label: 'Build agent', icon: FileText },
  { id: 'personalize', label: 'Personalize', icon: Palette },
  { id: 'install', label: 'Install', icon: Code2 },
  { id: 'complete', label: 'Done!', icon: CheckCircle2 },
];

interface OnboardingFlowProps {
  host: Host;
}

export default function OnboardingFlow({ host }: OnboardingFlowProps) {
  const router = useRouter();
  const supabase = createClient();
  
  const currentStepIndex = Math.max(0, STEPS.findIndex(s => s.id === host.onboarding_step));
  const [stepIndex, setStepIndex] = useState(currentStepIndex);

  const currentStep = STEPS[stepIndex];

  const updateStep = async (step: OnboardingStep) => {
    await supabase.from('hosts').update({ onboarding_step: step }).eq('id', host.id);
  };

  const advance = async () => {
    if (stepIndex < STEPS.length - 1) {
      const nextStep = STEPS[stepIndex + 1];
      setStepIndex(stepIndex + 1);
      await updateStep(nextStep.id as OnboardingStep);
    }
  };

  const skip = async () => {
    await updateStep('skipped');
    router.push('/dashboard');
  };

  const finish = async () => {
    await updateStep('complete');
    router.push('/dashboard');
  };

  const goToBuildAgent = async () => {
    // Create a new agent and redirect to playbook builder
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: agent } = await supabase
      .from('agents')
      .insert({
        host_id: host.id,
        internal_name: 'Main website agent',
        display_name: 'DiscoveryCall',
        status: 'draft',
        completed_sections: [],
      })
      .select()
      .single();

    if (agent) {
      await supabase.from('agent_config').insert({ agent_id: agent.id });
      await updateStep('build_agent');
      router.push(`/agents/${agent.id}/playbook?onboarding=1`);
    }
  };

  const stepProgress = ((stepIndex) / (STEPS.length - 1)) * 100;

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className="w-72 bg-white border-r border-gray-200 flex flex-col p-8">
        <div className="flex items-center gap-2 mb-10">
          <div className="w-8 h-8 bg-[#1783F1] rounded-lg flex items-center justify-center">
            <Bot className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-gray-900">DiscoveryCall</span>
        </div>

        <div className="space-y-1">
          {STEPS.slice(0, -1).map((step, idx) => {
            const Icon = step.icon;
            const isCompleted = idx < stepIndex;
            const isCurrent = idx === stepIndex;
            const isPending = idx > stepIndex;

            return (
              <div
                key={step.id}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm ${
                  isCurrent ? 'bg-blue-50 text-blue-700 font-medium' :
                  isCompleted ? 'text-gray-500' :
                  'text-gray-400'
                }`}
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                  isCompleted ? 'bg-green-500 text-white' :
                  isCurrent ? 'bg-blue-600 text-white' :
                  'bg-gray-100 text-gray-400'
                }`}>
                  {isCompleted ? (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  ) : (
                    <span className="text-xs font-bold">{idx + 1}</span>
                  )}
                </div>
                {step.label}
              </div>
            );
          })}
        </div>

        <div className="mt-auto">
          <div className="bg-gray-100 rounded-full h-1.5 mb-2">
            <div
              className="bg-[#1783F1] h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${stepProgress}%` }}
            />
          </div>
          <p className="text-xs text-gray-400">{stepIndex} of {STEPS.length - 1} steps complete</p>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="max-w-xl w-full">
          {/* Step 1: Welcome */}
          {currentStep.id === 'welcome' && (
            <div className="space-y-8">
              <div>
                <h1 className="text-4xl font-bold text-gray-900 mb-3">Welcome to DiscoveryCall.</h1>
                <p className="text-xl text-gray-500 italic" style={{ fontFamily: 'Georgia, serif' }}>
                  In 30 minutes, your first AI agent will be live on your website.
                </p>
              </div>
              <div className="space-y-4">
                {[
                  { icon: Globe, text: "Connect your Google account (for your playbook)" },
                  { icon: FileText, text: "Build your first agent (the 30-minute guided builder)" },
                  { icon: Code2, text: "Drop the embed code on your site" },
                ].map((item, i) => {
                  const Icon = item.icon;
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Icon className="w-4 h-4 text-blue-600" />
                      </div>
                      <p className="text-gray-700">{item.text}</p>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center gap-4">
                <Button
                  onClick={advance}
                  className="bg-[#1783F1] hover:bg-[#1468C8] px-8"
                  size="lg"
                >
                  Let&apos;s begin <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
                <button
                  onClick={skip}
                  className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
                >
                  Skip onboarding
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Connect Google */}
          {currentStep.id === 'connect_google' && (
            <div className="space-y-8">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-3">First, connect your Google account.</h1>
                <p className="text-gray-500">
                  We&apos;ll create one Google Doc for each agent&apos;s playbook — and that&apos;s all we&apos;ll ever access in your Drive.
                </p>
              </div>
              <Card className="border-blue-200 bg-blue-50">
                <CardContent className="pt-4">
                  <p className="text-sm text-blue-800">
                    <strong>🔒 Privacy first:</strong> DiscoveryCall uses Google&apos;s <code>drive.file</code> scope.
                    We can only see documents we create with you. Nothing else in your Drive is visible to us.
                  </p>
                </CardContent>
              </Card>
              <div className="flex items-center gap-4">
                <Button
                  onClick={() => {
                    // TODO: Trigger Google OAuth
                    advance();
                  }}
                  className="bg-[#1783F1] hover:bg-[#1468C8] px-8"
                  size="lg"
                >
                  <Globe className="w-4 h-4 mr-2" />
                  Connect Google →
                </Button>
                <button
                  onClick={advance}
                  className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
                >
                  Skip for now
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Build agent */}
          {currentStep.id === 'build_agent' && (
            <div className="space-y-8">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-3">Now, let&apos;s build your first agent.</h1>
                <p className="text-gray-500">
                  This is the 30 minutes that determines how well your agent sells for you.
                </p>
              </div>
              <Card>
                <CardContent className="pt-4 space-y-3">
                  <p className="text-sm font-medium text-gray-700">What you&apos;ll build:</p>
                  <ul className="space-y-2 text-sm text-gray-600">
                    {[
                      'Who you are and who you serve',
                      'What you offer and the transformation you create',
                      'Your discovery questions',
                      'How to handle objections',
                      'Your closing approach',
                    ].map((item, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <span className="w-5 h-5 bg-gray-100 rounded-full text-xs flex items-center justify-center text-gray-500 font-medium">
                          {i + 1}
                        </span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
              <div className="flex items-center gap-4">
                <Button
                  onClick={goToBuildAgent}
                  className="bg-[#1783F1] hover:bg-[#1468C8] px-8"
                  size="lg"
                >
                  Start the builder <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
                <button
                  onClick={advance}
                  className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
                >
                  I&apos;ll build it later
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Personalize */}
          {currentStep.id === 'personalize' && (
            <div className="space-y-8">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-3">How should your agent look and feel?</h1>
                <p className="text-gray-500">You can change all of this later from your agent settings.</p>
              </div>
              <Card>
                <CardContent className="pt-6 flex items-center justify-center py-12">
                  <p className="text-gray-400 text-sm">Personalization UI available after agent is created.</p>
                </CardContent>
              </Card>
              <div className="flex items-center gap-4">
                <Button
                  onClick={advance}
                  className="bg-[#1783F1] hover:bg-[#1468C8] px-8"
                  size="lg"
                >
                  Use defaults for now <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 5: Install */}
          {currentStep.id === 'install' && (
            <div className="space-y-8">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-3">Last step. Drop one line of code.</h1>
                <p className="text-gray-500">Add this to your site&apos;s <code>&lt;head&gt;</code> or before the closing <code>&lt;/body&gt;</code>.</p>
              </div>
              <Card>
                <CardContent className="pt-6">
                  <div className="bg-gray-900 rounded-lg p-4 font-mono text-xs text-green-400">
                    {`<!-- DiscoveryCall Widget -->`}<br />
                    {`<script src="https://embed.discoverycall.ai/loader.js"`}<br />
                    {`  data-token="YOUR_EMBED_TOKEN"`}<br />
                    {`  async></script>`}
                  </div>
                  <p className="text-xs text-gray-400 mt-3">
                    Get your embed token from your agent settings page.
                  </p>
                </CardContent>
              </Card>
              <div className="flex items-center gap-4">
                <Button
                  onClick={advance}
                  className="bg-[#1783F1] hover:bg-[#1468C8] px-8"
                  size="lg"
                >
                  I&apos;ve installed it <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
                <button
                  onClick={advance}
                  className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
                >
                  I&apos;ll install it later
                </button>
              </div>
            </div>
          )}

          {/* Step 6: Complete */}
          {currentStep.id === 'complete' && (
            <div className="space-y-8">
              <div>
                <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center mb-6">
                  <CheckCircle2 className="w-8 h-8 text-green-500" />
                </div>
                <h1 className="text-3xl font-bold text-gray-900 mb-3">Your agent is live.</h1>
                <p className="text-xl text-gray-500 italic" style={{ fontFamily: 'Georgia, serif' }}>
                  Ready to talk to your visitors.
                </p>
              </div>
              <div className="flex items-center gap-4">
                <Button
                  onClick={finish}
                  className="bg-[#1783F1] hover:bg-[#1468C8] px-8"
                  size="lg"
                >
                  Go to dashboard <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
