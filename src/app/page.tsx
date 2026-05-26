import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Bot, MessageSquare, TrendingUp, Shield, ArrowRight, Check } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="border-b border-gray-100 px-6 py-4 flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#1783F1] rounded-lg flex items-center justify-center">
            <Bot className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-gray-900 text-lg">DiscoveryCall</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/login" className="text-gray-600 text-sm hover:text-gray-900">Sign in</Link>
          <Link href="/signup">
            <Button className="bg-[#1783F1] hover:bg-[#1468C8]">
              Start free trial
            </Button>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto text-center pt-24 pb-16 px-6">
        <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 text-xs font-medium px-3 py-1 rounded-full mb-6">
          <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
          14-day free trial · No card required
        </div>
        <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
          Your website does discovery now.
        </h1>
        <p className="text-xl text-gray-500 mb-10 max-w-2xl mx-auto">
          Embed an AI agent trained on your playbook. It uses SPIN, MEDDIC, and Challenger frameworks to qualify visitors and route hot leads directly to your calendar.
        </p>
        <div className="flex items-center gap-4 justify-center">
          <Link href="/signup">
            <Button size="lg" className="bg-[#1783F1] hover:bg-[#1468C8] text-base px-8">
              Get started free <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
        <p className="text-xs text-gray-400 mt-4">30 minutes from signup to live. No developer needed.</p>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-6 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              icon: MessageSquare,
              title: 'Real conversations, not forms',
              description: 'Visitors type, your agent listens and responds. SPIN questions surface the real problem. Challenger reframes it.',
            },
            {
              icon: TrendingUp,
              title: 'Intent scoring, every turn',
              description: 'Every reply gets scored 0–100. Hot leads (70+) fire an immediate email report with the full transcript.',
            },
            {
              icon: Shield,
              title: 'Your playbook, your voice',
              description: 'Google Doc is the source of truth. Change one word, your agent learns immediately. You stay in control.',
            },
          ].map((feature, i) => {
            const Icon = feature.icon;
            return (
              <div key={i} className="text-center">
                <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Icon className="w-6 h-6 text-[#1783F1]" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-500 text-sm">{feature.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Pricing */}
      <section className="bg-gray-50 py-20 px-6">
        <div className="max-w-4xl mx-auto text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">Simple, honest pricing</h2>
          <p className="text-gray-500">Start free. Upgrade when your pipeline proves it.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {[
            { name: 'Starter', price: '$99', features: ['1 agent', '200 convos/mo', 'Email reports', 'Dashboard'] },
            { name: 'Pro', price: '$249', features: ['3 agents', 'Unlimited convos', 'White-label', 'Priority support'], highlight: true },
            { name: 'Agency', price: '$499', features: ['10 agents', 'Unlimited convos', '3 team seats', 'Everything'] },
          ].map((plan, i) => (
            <div key={i} className={`bg-white rounded-2xl p-6 shadow-sm ${plan.highlight ? 'ring-2 ring-[#1783F1]' : ''}`}>
              <div className="mb-4">
                <p className="text-sm font-medium text-gray-500 mb-1">{plan.name}</p>
                <div className="flex items-baseline">
                  <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
                  <span className="text-gray-400 ml-1">/mo</span>
                </div>
              </div>
              <ul className="space-y-2 mb-6">
                {plan.features.map((f, j) => (
                  <li key={j} className="flex items-center gap-2 text-sm text-gray-600">
                    <Check className="w-4 h-4 text-green-500" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/signup">
                <Button
                  className={`w-full ${plan.highlight ? 'bg-[#1783F1] hover:bg-[#1468C8]' : ''}`}
                  variant={plan.highlight ? 'default' : 'outline'}
                >
                  Start free trial
                </Button>
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8 px-6">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-[#1783F1] rounded-md flex items-center justify-center">
              <Bot className="w-3 h-3 text-white" />
            </div>
            <span className="text-sm text-gray-500">DiscoveryCall · Built by <a href="https://trusttai.com" className="text-[#1783F1] hover:underline">Trust Tai</a></span>
          </div>
          <div className="flex gap-6 text-xs text-gray-400">
            <a href="#" className="hover:text-gray-600">Privacy</a>
            <a href="#" className="hover:text-gray-600">Terms</a>
            <a href="mailto:hello@discoverycall.ai" className="hover:text-gray-600">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
