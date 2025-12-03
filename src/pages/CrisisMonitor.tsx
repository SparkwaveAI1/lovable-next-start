import React, { useState } from 'react';
import { useCrisisIndicators } from '@/hooks/useCrisisIndicators';
import { RefreshCw } from 'lucide-react';
import { format } from 'date-fns';

const CrisisMonitor = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const { loading, lastUpdated, refreshData, getIndicatorValue } = useCrisisIndicators();

  // Get live values from DB, with fallbacks to hardcoded defaults
  const sofrIorbSpread = getIndicatorValue('sofr_iorb_spread') ?? 22;
  const reverseRepo = getIndicatorValue('reverse_repo') ?? 0;
  
  // Manual entry indicators - fetched from DB with fallbacks
  const creDelinquency = getIndicatorValue('cre_delinquency') ?? 11.7;
  const moveIndex = getIndicatorValue('move_index') ?? 71;

  const indicators = [
    {
      name: 'Plumbing Stress',
      metric: 'SOFR - IORB Spread',
      currentValue: sofrIorbSpread,
      currentDisplay: `${sofrIorbSpread >= 0 ? '+' : ''}${sofrIorbSpread} bps`,
      unit: 'basis points',
      normalMax: 0,
      yellowMax: 10,
      whatIsIt: 'The SOFR-IORB spread measures how desperately banks need cash. SOFR is what banks pay to borrow overnight. IORB is what the Fed pays banks to park cash. When SOFR exceeds IORB, banks are so desperate for cash they are paying above the Fed rate.',
      whyItMatters: 'A positive spread means the banking system plumbing is clogged. Banks cannot get the cash they need through normal channels.',
      currentAnalysis: `At ${sofrIorbSpread >= 0 ? '+' : ''}${sofrIorbSpread} basis points, ${sofrIorbSpread > 10 ? 'banks are paying significantly above the Fed target rate just to get overnight cash. This is a CRITICAL warning sign - well past the danger threshold of 10-15 bps.' : sofrIorbSpread > 0 ? 'there is some stress in overnight lending markets.' : 'overnight lending markets are functioning normally.'}`,
      dataSource: 'FRED (SOFR, IORB)',
      isLive: true
    },
    {
      name: 'System Buffer',
      metric: 'Reverse Repo Facility (RRP)',
      currentValue: reverseRepo,
      currentDisplay: reverseRepo < 0.1 ? '~$0B' : `$${reverseRepo.toFixed(2)}T`,
      unit: 'trillions USD',
      normalMin: 0.3,
      yellowMin: 0.1,
      isInverted: true,
      whatIsIt: 'The Reverse Repo Facility is where money market funds park excess cash overnight at the Fed. Think of it as an overflow tank for extra money in the financial system.',
      whyItMatters: 'When the RRP is full, it absorbs shocks from Treasury issuance. When it is empty, every new Treasury bond issued sucks cash directly from bank reserves.',
      currentAnalysis: reverseRepo < 0.1 ? 'The buffer is essentially EMPTY. This means the financial system has no shock absorber left. Any new government borrowing now competes directly with banks for cash.' : `At $${reverseRepo.toFixed(2)}T, there is still some buffer in the system.`,
      dataSource: 'FRED (RRPONTSYD)',
      isLive: true
    },
    {
      name: 'Commercial Real Estate Crisis',
      metric: 'Office Building Loan Delinquencies',
      currentValue: creDelinquency,
      currentDisplay: `${creDelinquency}%`,
      unit: 'percent',
      normalMax: 5,
      yellowMax: 8,
      redMax: 10,
      whatIsIt: 'This measures what percentage of commercial office building loans are 30+ days past due. When businesses cannot pay their office building mortgages, the banks holding those loans take losses.',
      whyItMatters: 'Regional banks hold most of these loans. High delinquency rates mean guaranteed losses for these banks, potentially triggering failures.',
      currentAnalysis: 'At 11.7%, we are well past the 10% threshold where extend and pretend (banks quietly renewing bad loans) breaks down. Regional bank losses are now unavoidable.',
      dataSource: 'Trepp CMBS Research (Manual)',
      isLive: false
    },
    {
      name: 'Bond Market Fear',
      metric: 'MOVE Index',
      currentValue: moveIndex,
      currentDisplay: `${moveIndex}`,
      unit: 'index points',
      normalMax: 100,
      yellowMax: 130,
      whatIsIt: 'The MOVE Index is like the VIX, but for bonds. It measures expected volatility in US Treasury yields. Higher equals more fear and uncertainty in the bond market.',
      whyItMatters: 'When bond traders are scared, lending freezes up. A spike in MOVE often precedes broader market crashes.',
      currentAnalysis: 'At 71, the bond market appears calm. BUT this is misleading - the Fed $125B injection is artificially suppressing fear. Watch for this to spike if injections stop.',
      dataSource: 'ICE BofA (Manual)',
      isLive: false
    }
  ];

  interface Indicator {
    name: string;
    metric: string;
    currentValue: number;
    currentDisplay: string;
    unit: string;
    normalMax?: number;
    yellowMax?: number;
    redMax?: number;
    normalMin?: number;
    yellowMin?: number;
    isInverted?: boolean;
    whatIsIt: string;
    whyItMatters: string;
    currentAnalysis: string;
    dataSource: string;
    isLive?: boolean;
  }

  const getIndicatorStatus = (indicator: Indicator) => {
    const val = indicator.currentValue;
    if (indicator.isInverted) {
      if (val <= (indicator.yellowMin || 0)) return 'critical';
      if (val <= (indicator.normalMin || 0)) return 'warning';
      return 'normal';
    } else {
      if (indicator.redMax && val > indicator.redMax) return 'critical';
      if (val > (indicator.yellowMax || Infinity)) return 'critical';
      if (val > (indicator.normalMax || Infinity)) return 'warning';
      return 'normal';
    }
  };

  const getStatusLabel = (status: string) => {
    switch(status) {
      case 'critical': return { text: 'CRITICAL', bg: 'bg-red-600', border: 'border-red-500' };
      case 'warning': return { text: 'WARNING', bg: 'bg-amber-600', border: 'border-amber-500' };
      case 'normal': return { text: 'NORMAL', bg: 'bg-emerald-600', border: 'border-emerald-500' };
      default: return { text: 'UNKNOWN', bg: 'bg-zinc-600', border: 'border-zinc-500' };
    }
  };

  const getCardStyle = (status: string) => {
    switch(status) {
      case 'critical': return 'bg-red-950/50 border-red-500/70';
      case 'warning': return 'bg-amber-950/50 border-amber-500/70';
      case 'normal': return 'bg-emerald-950/30 border-emerald-500/50';
      default: return 'bg-zinc-900 border-zinc-700';
    }
  };

  const statuses = indicators.map(getIndicatorStatus);
  const criticalCount = statuses.filter(s => s === 'critical').length;
  const warningCount = statuses.filter(s => s === 'warning').length;

  let overallStatus, overallMessage;
  if (criticalCount >= 2) {
    overallStatus = 'critical';
    overallMessage = criticalCount + ' of 4 indicators in CRITICAL zone';
  } else if (criticalCount >= 1) {
    overallStatus = 'warning';
    overallMessage = criticalCount + ' critical, ' + warningCount + ' warning indicators';
  } else if (warningCount >= 2) {
    overallStatus = 'warning';
    overallMessage = warningCount + ' indicators showing stress';
  } else {
    overallStatus = 'normal';
    overallMessage = 'All indicators within normal ranges';
  }

  const creditIndicators = [
    {
      spread: 'HYG / LQD Ratio',
      whatIsIt: 'Compares junk bond prices (HYG) to investment-grade bond prices (LQD). When investors get scared, they sell junk first.',
      howToRead: 'Falling ratio = investors fleeing risky debt. This gave a 3-month warning before the 2008 crash.',
      yellowFlag: 'Below 0.68',
      redFlag: 'Below 0.64',
      chartSymbol: 'AMEX:HYG / AMEX:LQD'
    },
    {
      spread: 'LQD / IEI Ratio',
      whatIsIt: 'Compares investment-grade corporate bonds (LQD) to Treasury bonds (IEI). This shows if even safe companies are losing access to credit.',
      howToRead: 'Falling ratio = corporate credit freezing up. This is the firewall breach signal.',
      yellowFlag: 'Below 0.88',
      redFlag: 'Below 0.85',
      chartSymbol: 'AMEX:LQD / AMEX:IEI'
    },
    {
      spread: 'HYG Price vs NAV',
      whatIsIt: 'Compares what you can sell the HYG ETF for vs. the theoretical value of bonds inside it.',
      howToRead: 'Large discount = the underlying bond market has frozen. No one is bidding on the actual bonds.',
      yellowFlag: 'Discount > 0.5%',
      redFlag: 'Discount > 2.0%',
      chartSymbol: 'Check ETF provider website'
    }
  ];

  const cascadePhases = [
    {
      phase: 1,
      name: 'Buffer Dies',
      status: 'active',
      trigger: 'Reverse Repo Facility drains to zero',
      whatsHappening: 'The financial system shock absorber is gone. Every new Treasury bond now sucks cash directly from banks.',
      consequence: 'Overnight lending rates become volatile. Banks scramble for cash.',
      watchFor: 'Spikes in SOFR rate, especially around month-end or Treasury auctions',
      currentState: 'We are HERE. RRP is effectively at zero.'
    },
    {
      phase: 2,
      name: 'Collateral Crisis',
      status: 'pending',
      trigger: 'Banks need cash but their collateral (CRE loans) is rejected',
      whatsHappening: 'Banks try to borrow using their loan portfolios as collateral, but lenders refuse to accept shaky commercial real estate loans.',
      consequence: 'Banks are forced to sell their safe assets - US Treasuries - to raise cash.',
      watchFor: 'MOVE Index spiking above 130-150 as Treasury selling accelerates',
      currentState: 'Not yet triggered, but CRE delinquencies are setting the stage.'
    },
    {
      phase: 3,
      name: 'The Freeze',
      status: 'pending',
      trigger: 'Banks stop trusting each other collateral entirely',
      whatsHappening: 'Overnight lending freezes. Banks hoard cash. No one knows who is solvent.',
      consequence: 'Credit markets seize up. Businesses cannot roll over their debt.',
      watchFor: 'Fed announcing emergency facilities or Yield Curve Control (unlimited money printing)',
      currentState: 'This is the endgame scenario we are monitoring to avoid.'
    }
  ];

  const crashTimeline = [
    {
      phase: 'The Shock',
      timeframe: 'Hours 0-24',
      description: 'The trigger event hits. Trading algorithms react first. Futures drop overnight but may partially recover by market open.',
      yourExperience: 'You see scary headlines, but the market might close flat or down only 0.5%. It feels like a nothing burger.',
      danger: 'False calm. The real damage is happening in the bond market where you cannot easily see it.'
    },
    {
      phase: 'The Trap',
      timeframe: 'Days 2-5',
      isTrap: true,
      description: 'Bad news is good news. Stocks actually RALLY because traders expect the Fed to ride to the rescue with rate cuts or stimulus.',
      yourExperience: 'Relief! Markets are green. Pundits say the worst is over. Your portfolio recovers.',
      danger: 'This is the BULL TRAP. Retail investors pile in, thinking they are buying the dip. Smart money is quietly exiting.'
    },
    {
      phase: 'The Realization',
      timeframe: 'Days 6-14',
      description: 'Credit spreads blow out. You start seeing headlines about liquidity concerns at specific funds or banks. The smart money has stopped lending.',
      yourExperience: 'Slow bleed. Market drops 0.5-1% per day. Death by a thousand cuts. Each day feels not that bad.',
      danger: 'The frog is boiling. By the time it feels serious, you have already lost 8-12%.'
    },
    {
      phase: 'The Flush',
      timeframe: 'Weeks 3-4',
      description: 'Capitulation. Margin calls force selling. Funds liquidate positions to meet redemptions. Forced selling begets more forced selling.',
      yourExperience: 'CRASH. Down 3-5% in single days. VIX spikes above 40. Pure panic.',
      danger: 'If you are selling here, you are selling at the bottom to those with cash ready.'
    }
  ];

  const tabs = [
    { id: 'dashboard', label: 'DASHBOARD' },
    { id: 'credit', label: 'CREDIT STRESS' },
    { id: 'cascade', label: 'CASCADE SCENARIO' },
    { id: 'timeline', label: 'CRASH TIMELINE' },
    { id: 'strategy', label: 'WHAT TO DO' }
  ];

  const scrollToHowToTrack = () => {
    document.getElementById('how-to-track')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800 bg-zinc-900/90 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full animate-pulse ${
                overallStatus === 'critical' ? 'bg-red-500' : 
                overallStatus === 'warning' ? 'bg-amber-500' : 'bg-emerald-500'
              }`} />
              <h1 className="text-xl font-bold tracking-tight">CRISIS MONITOR</h1>
            </div>
            <div className="flex items-center gap-3">
              {lastUpdated && (
                <span className="text-xs text-zinc-500">
                  Last updated: {format(lastUpdated, 'MMM d, yyyy h:mm a')}
                </span>
              )}
              <button
                onClick={refreshData}
                disabled={loading}
                className="flex items-center gap-2 px-3 py-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 rounded border border-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                {loading ? 'Updating...' : 'Refresh Data'}
              </button>
            </div>
          </div>

          <nav className="flex gap-1 mt-4 overflow-x-auto pb-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 text-sm tracking-wide transition-all whitespace-nowrap rounded-t ${
                  activeTab === tab.id 
                    ? 'bg-zinc-800 text-zinc-100 border-t-2 border-red-500' 
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        
        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            
            <div className={`rounded-xl p-6 border-2 ${
              overallStatus === 'critical' ? 'bg-red-950/40 border-red-500' :
              overallStatus === 'warning' ? 'bg-amber-950/40 border-amber-500' :
              'bg-emerald-950/40 border-emerald-500'
            }`}>
              <div className="flex items-start gap-4">
                <div className={`w-4 h-4 rounded-full mt-1 animate-pulse ${
                  overallStatus === 'critical' ? 'bg-red-500' :
                  overallStatus === 'warning' ? 'bg-amber-500' : 'bg-emerald-500'
                }`} />
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <h2 className="text-2xl font-bold">
                      {overallStatus === 'critical' ? 'ELEVATED RISK' :
                       overallStatus === 'warning' ? 'CAUTION' : 'STABLE'}
                    </h2>
                    <span className={`text-xs px-2 py-1 rounded ${
                      overallStatus === 'critical' ? 'bg-red-600' :
                      overallStatus === 'warning' ? 'bg-amber-600' : 'bg-emerald-600'
                    }`}>
                      {overallMessage}
                    </span>
                  </div>
                  
                  <h3 className="font-semibold text-zinc-300 mb-2">Current Situation (December 2025):</h3>
                  <p className="text-zinc-400 leading-relaxed">
                    The Federal Reserve halted Quantitative Tightening on December 1, 2025 and has injected ~$125 billion through emergency repo operations. 
                    This signals the banking system cannot function without Fed life support. The bond market appears calm (MOVE Index ~71), 
                    but this is artificial - maintained only by continuous Fed intervention. Two of four indicators are in critical territory.
                  </p>
                  
                  <div className="mt-4 pt-4 border-t border-zinc-700/50">
                    <p className="text-xs text-zinc-500">
                      <strong>How is this status determined?</strong> We monitor 4 key financial stress indicators from Federal Reserve data, 
                      CMBS research, and bond market indices. When 2+ indicators breach critical thresholds, system status is ELEVATED RISK.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-zinc-300">Key Stress Indicators</h2>
              
              {indicators.map((ind, idx) => {
                const status = getIndicatorStatus(ind);
                const statusLabel = getStatusLabel(status);
                
                return (
                  <div 
                    key={idx}
                    className={`border-2 rounded-xl overflow-hidden ${getCardStyle(status)}`}
                  >
                    <div className={`px-5 py-3 flex items-center justify-between flex-wrap gap-2 ${
                      status === 'critical' ? 'bg-red-900/50' :
                      status === 'warning' ? 'bg-amber-900/50' : 'bg-emerald-900/30'
                    }`}>
                      <div>
                        <h3 className="font-bold text-lg">{ind.name}</h3>
                        <p className="text-sm text-zinc-400">{ind.metric}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-3xl font-bold">{ind.currentDisplay}</div>
                        <span className={`inline-block mt-1 text-xs font-bold px-3 py-1 rounded-full ${statusLabel.bg}`}>
                          {statusLabel.text}
                        </span>
                      </div>
                    </div>
                    
                    <div className="p-5 space-y-4">
                      <div>
                        <h4 className="text-sm font-semibold text-zinc-300 mb-1">What is this measuring?</h4>
                        <p className="text-sm text-zinc-400">{ind.whatIsIt}</p>
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-semibold text-zinc-300 mb-1">Why does it matter?</h4>
                        <p className="text-sm text-zinc-400">{ind.whyItMatters}</p>
                      </div>
                      
                      <div className={`p-3 rounded-lg ${
                        status === 'critical' ? 'bg-red-900/30 border border-red-700/50' :
                        status === 'warning' ? 'bg-amber-900/30 border border-amber-700/50' :
                        'bg-emerald-900/20 border border-emerald-700/50'
                      }`}>
                        <h4 className="text-sm font-semibold mb-1">Current Reading Analysis:</h4>
                        <p className="text-sm">{ind.currentAnalysis}</p>
                      </div>
                      
                      <div className="flex gap-4 text-xs pt-2 border-t border-zinc-800 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                          <span className="text-zinc-500">Normal: {ind.isInverted ? 'Above $' + ind.normalMin + 'B' : 'Below ' + ind.normalMax + ' ' + ind.unit}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-amber-500"></span>
                          <span className="text-zinc-500">Warning: {ind.isInverted ? '$' + ind.yellowMin + '-' + ind.normalMin + 'B' : ind.normalMax + '-' + ind.yellowMax + ' ' + ind.unit}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-red-500"></span>
                          <span className="text-zinc-500">Critical: {ind.isInverted ? 'Below $' + ind.yellowMin + 'B' : 'Above ' + ind.yellowMax + ' ' + ind.unit}</span>
                        </div>
                      </div>
                      
                      <p className="text-xs text-zinc-600">
                        Source: {ind.dataSource} | Last updated: {ind.isLive && lastUpdated ? format(lastUpdated, 'MMM d, yyyy') : 'Manual update'}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'credit' && (
          <div className="space-y-6">
            
            <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-4 flex items-center justify-between flex-wrap gap-4">
              <div>
                <h2 className="font-bold text-lg">Credit Contagion Indicators</h2>
                <p className="text-sm text-zinc-400">Track whether banking stress is spreading to corporations</p>
              </div>
              <button 
                onClick={scrollToHowToTrack}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-sm font-medium transition-colors"
              >
                How to Track These
              </button>
            </div>

            <div className="space-y-4">
              {creditIndicators.map((ind, idx) => (
                <div key={idx} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                  <h3 className="font-bold text-xl mb-3">{ind.spread}</h3>
                  
                  <div className="space-y-3">
                    <div>
                      <h4 className="text-sm font-semibold text-zinc-300">What is this?</h4>
                      <p className="text-sm text-zinc-400">{ind.whatIsIt}</p>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-semibold text-zinc-300">How to read it:</h4>
                      <p className="text-sm text-zinc-400">{ind.howToRead}</p>
                    </div>
                    
                    <div className="flex gap-4 pt-3 flex-wrap">
                      <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg px-4 py-3 flex-1 min-w-fit">
                        <span className="text-amber-400 text-xs font-semibold">WARNING LEVEL</span>
                        <div className="font-bold mt-1">{ind.yellowFlag}</div>
                      </div>
                      <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 flex-1 min-w-fit">
                        <span className="text-red-400 text-xs font-semibold">CRITICAL LEVEL</span>
                        <div className="font-bold mt-1">{ind.redFlag}</div>
                      </div>
                    </div>
                    
                    <p className="text-xs text-zinc-500">
                      TradingView symbol: <code className="bg-zinc-800 px-2 py-0.5 rounded">{ind.chartSymbol}</code>
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div id="how-to-track" className="bg-emerald-950/30 border border-emerald-700/50 rounded-xl p-6 scroll-mt-24">
              <h3 className="font-bold text-lg text-emerald-400 mb-4">How to Track These Yourself (Free)</h3>
              
              <div className="space-y-4">
                <div className="bg-zinc-900/50 rounded-lg p-4">
                  <h4 className="font-semibold mb-2">Step 1: Open TradingView</h4>
                  <p className="text-sm text-zinc-400">
                    Go to <a href="https://tradingview.com" target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline">TradingView.com</a> (free account works)
                  </p>
                </div>
                
                <div className="bg-zinc-900/50 rounded-lg p-4">
                  <h4 className="font-semibold mb-2">Step 2: Enter the Chart Symbol</h4>
                  <p className="text-sm text-zinc-400 mb-2">
                    In the search bar, type: <code className="bg-zinc-800 px-2 py-1 rounded">AMEX:HYG / AMEX:LQD</code>
                  </p>
                  <p className="text-sm text-zinc-500">This creates a ratio chart comparing the two ETFs</p>
                </div>
                
                <div className="bg-zinc-900/50 rounded-lg p-4">
                  <h4 className="font-semibold mb-2">Step 3: Set Daily Timeframe</h4>
                  <p className="text-sm text-zinc-400">Click the timeframe selector and choose D for daily</p>
                </div>
                
                <div className="bg-zinc-900/50 rounded-lg p-4">
                  <h4 className="font-semibold mb-2">Step 4: Add Moving Average</h4>
                  <p className="text-sm text-zinc-400">Click Indicators, search Moving Average, set length to 50</p>
                </div>
                
                <div className="bg-red-900/30 border border-red-700/50 rounded-lg p-4">
                  <h4 className="font-semibold text-red-400 mb-2">The Danger Signal</h4>
                  <p className="text-sm text-zinc-300">
                    If the line crosses BELOW the 50-day moving average AND accelerates downward, 
                    the credit window is slamming shut. This pattern appeared 3 months before the 2008 crash.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'cascade' && (
          <div className="space-y-6">
            
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
              <h2 className="font-bold text-xl mb-2">How a Financial Crisis Cascades</h2>
              <p className="text-zinc-400">
                Systemic failures do not happen all at once. They follow a predictable sequence as problems in one part of the 
                financial system spread to others. Understanding this sequence helps you recognize where we are.
              </p>
            </div>

            <div className="relative">
              <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-zinc-800" />
              
              {cascadePhases.map((phase, idx) => (
                <div key={idx} className="relative pl-20 pb-8">
                  <div className={`absolute left-5 w-7 h-7 rounded-full border-2 flex items-center justify-center text-sm font-bold ${
                    phase.status === 'active' 
                      ? 'bg-red-500 border-red-400 animate-pulse' 
                      : 'bg-zinc-900 border-zinc-600'
                  }`}>
                    {phase.phase}
                  </div>
                  
                  <div className={`rounded-xl border-2 overflow-hidden ${
                    phase.status === 'active' 
                      ? 'border-red-500 bg-red-950/30' 
                      : 'border-zinc-700 bg-zinc-900'
                  }`}>
                    <div className={`px-5 py-3 flex items-center justify-between flex-wrap gap-2 ${
                      phase.status === 'active' ? 'bg-red-900/40' : 'bg-zinc-800/50'
                    }`}>
                      <h3 className="font-bold text-xl">{phase.name}</h3>
                      {phase.status === 'active' && (
                        <span className="text-xs bg-red-600 px-3 py-1 rounded-full font-bold animate-pulse">
                          WE ARE HERE
                        </span>
                      )}
                      {phase.status === 'pending' && (
                        <span className="text-xs bg-zinc-700 px-3 py-1 rounded-full">
                          PENDING
                        </span>
                      )}
                    </div>
                    
                    <div className="p-5 space-y-4">
                      <div>
                        <h4 className="text-sm font-semibold text-amber-400 mb-1">Trigger:</h4>
                        <p className="text-sm text-zinc-300">{phase.trigger}</p>
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-semibold text-zinc-300 mb-1">What is happening:</h4>
                        <p className="text-sm text-zinc-400">{phase.whatsHappening}</p>
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-semibold text-zinc-300 mb-1">Consequence:</h4>
                        <p className="text-sm text-zinc-400">{phase.consequence}</p>
                      </div>
                      
                      <div className="bg-zinc-800/50 rounded-lg p-3">
                        <h4 className="text-sm font-semibold text-emerald-400 mb-1">Watch for:</h4>
                        <p className="text-sm text-zinc-300">{phase.watchFor}</p>
                      </div>
                      
                      {phase.status === 'active' && (
                        <div className="bg-red-900/30 border border-red-700/50 rounded-lg p-3">
                          <h4 className="text-sm font-semibold text-red-400 mb-1">Current State:</h4>
                          <p className="text-sm text-zinc-200">{phase.currentState}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-red-950/40 border-2 border-red-600 rounded-xl p-6">
              <h3 className="font-bold text-xl text-red-400 mb-3">End State: Yield Curve Control</h3>
              <p className="text-zinc-300 mb-4">
                If all three phases complete, the Federal Reserve will be forced to announce Yield Curve Control - 
                a commitment to print unlimited money to keep interest rates from spiking.
              </p>
              <p className="text-zinc-400">
                This saves the banking system but effectively sacrifices the dollar. Hard assets (Gold, Real Estate, Bitcoin) 
                typically surge in this scenario as investors flee depreciating currency.
              </p>
            </div>
          </div>
        )}

        {activeTab === 'timeline' && (
          <div className="space-y-6">
            
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
              <h2 className="font-bold text-xl mb-2">The Wile E. Coyote Effect</h2>
              <p className="text-zinc-400">
                When bond markets break, stocks do not crash instantly. Like the cartoon coyote running off a cliff, 
                there is a delay before gravity kicks in. Understanding this 3-4 week sequence can save you from the Bull Trap.
              </p>
            </div>

            <div className="space-y-4">
              {crashTimeline.map((phase, idx) => (
                <div 
                  key={idx}
                  className={`rounded-xl border-2 overflow-hidden ${
                    phase.isTrap 
                      ? 'border-amber-500 bg-amber-950/30' 
                      : 'border-zinc-700 bg-zinc-900'
                  }`}
                >
                  <div className={`px-5 py-3 flex items-center justify-between flex-wrap gap-2 ${
                    phase.isTrap ? 'bg-amber-900/40' : 'bg-zinc-800/50'
                  }`}>
                    <div>
                      <span className="text-xs text-zinc-500">PHASE {idx + 1}</span>
                      <h3 className="font-bold text-xl">{phase.phase}</h3>
                    </div>
                    <span className={`text-sm font-mono ${phase.isTrap ? 'text-amber-400' : 'text-zinc-400'}`}>
                      {phase.timeframe}
                    </span>
                  </div>
                  
                  <div className="p-5 space-y-4">
                    <div>
                      <h4 className="text-sm font-semibold text-zinc-300 mb-1">What happens:</h4>
                      <p className="text-sm text-zinc-400">{phase.description}</p>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-semibold text-zinc-300 mb-1">Your experience:</h4>
                      <p className="text-sm text-zinc-400">{phase.yourExperience}</p>
                    </div>
                    
                    <div className={`rounded-lg p-3 ${
                      phase.isTrap 
                        ? 'bg-amber-900/40 border border-amber-600/50' 
                        : 'bg-red-900/20 border border-red-700/30'
                    }`}>
                      <h4 className={`text-sm font-semibold mb-1 ${phase.isTrap ? 'text-amber-400' : 'text-red-400'}`}>
                        {phase.isTrap ? 'THE TRAP:' : 'The danger:'}
                      </h4>
                      <p className="text-sm">{phase.danger}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-amber-950/30 border-2 border-amber-600 rounded-xl p-6">
              <h3 className="font-bold text-xl text-amber-400 mb-3">Weekend Risk Factor</h3>
              <p className="text-zinc-300 mb-4">
                Systemic failures almost always happen over weekends when markets are closed. 
                Lehman Brothers, Silicon Valley Bank, Signature Bank - all announced on weekends.
              </p>
              <div className="bg-zinc-900/50 rounded-lg p-4 mb-4">
                <h4 className="font-semibold mb-2">The Pattern:</h4>
                <ol className="text-sm text-zinc-400 space-y-1">
                  <li>1. Trigger event hits Wednesday/Thursday</li>
                  <li>2. Regulators try to patch it quietly on Friday</li>
                  <li>3. Patch fails over the weekend</li>
                  <li>4. You wake up Monday to a 3%+ gap down</li>
                </ol>
              </div>
              <div className="p-4 bg-red-900/30 rounded-lg border border-red-700/50">
                <h4 className="font-semibold text-red-400 mb-2">The 3-Day Rule</h4>
                <p className="text-sm text-zinc-300">
                  If the HYG/LQD ratio falls for 3 consecutive days after a trigger event, 
                  the equity flush is beginning. Do not wait for confirmation.
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'strategy' && (
          <div className="space-y-6">
            
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
              <h2 className="font-bold text-xl mb-2">The Political Reality</h2>
              <p className="text-zinc-400">
                Understanding how policymakers will respond is as important as understanding the technical indicators. 
                History shows they will almost always choose inflation over deflation.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-zinc-900 border border-zinc-600 rounded-xl p-5 opacity-60">
                <h3 className="font-bold text-lg text-zinc-400 mb-3">Option A: Deflationary Flush</h3>
                <p className="text-sm text-zinc-500 mb-4">
                  Let failing banks fail. Wipe out bad CRE debt. Allow S&P 500 to drop 40% to fair value. 
                  Accept a deep recession.
                </p>
                <div className="text-red-400 text-sm font-semibold">
                  Politically Unacceptable
                </div>
                <p className="text-xs text-zinc-600 mt-2">
                  No administration will willingly preside over a depression.
                </p>
              </div>
              
              <div className="bg-emerald-950/40 border-2 border-emerald-500 rounded-xl p-5">
                <h3 className="font-bold text-lg text-emerald-400 mb-3">Option B: Inflationary Save</h3>
                <p className="text-sm text-zinc-400 mb-4">
                  Print money to fill the hole. Guarantee deposits. Cap interest rates if needed. 
                  Sacrifice the dollar to save the system.
                </p>
                <div className="text-emerald-400 text-sm font-semibold">
                  Most Likely Outcome
                </div>
                <p className="text-xs text-zinc-500 mt-2">
                  Inflation hurts slowly. Deflation hurts immediately and visibly.
                </p>
              </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
              <h3 className="font-bold text-xl mb-4">What This Means for Different Assets</h3>
              
              <div className="space-y-5">
                <div className="flex gap-4">
                  <div className="text-3xl">📈</div>
                  <div>
                    <h4 className="font-bold text-lg">Stocks: The Melt-Up Trap</h4>
                    <p className="text-sm text-zinc-400 mt-1">
                      The market likely does not crash in dollar terms. It may even hit new highs. 
                      But if the dollar loses 15% of its value, your gains are an illusion. 
                      This is how Venezuela stock market became one of the world best performers.
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-4">
                  <div className="text-3xl">🏢</div>
                  <div>
                    <h4 className="font-bold text-lg">Commercial Real Estate: Zombie Mode</h4>
                    <p className="text-sm text-zinc-400 mt-1">
                      Fed liquidity lets banks extend and pretend - rolling over bad loans to avoid recognizing losses. 
                      No crash, but no recovery either. Empty office towers sit frozen for years.
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-4">
                  <div className="text-3xl">🏠</div>
                  <div>
                    <h4 className="font-bold text-lg">Residential Real Estate: Price Floor</h4>
                    <p className="text-sm text-zinc-400 mt-1">
                      If the Fed caps mortgage rates, home prices stay stubbornly high in dollar terms. 
                      Hard assets hold their value when currency is being debased.
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-4">
                  <div className="text-3xl">💵</div>
                  <div>
                    <h4 className="font-bold text-lg">Cash: The Slow Burn</h4>
                    <p className="text-sm text-zinc-400 mt-1">
                      Cash is what the Fed is printing to save the system. Holding excess cash long-term 
                      means watching your purchasing power erode at 5-8% per year.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-emerald-950/30 border border-emerald-600/50 rounded-xl p-5">
                <h3 className="font-bold text-emerald-400 mb-4">Consider Owning</h3>
                <ul className="space-y-3 text-sm text-zinc-300">
                  <li className="flex gap-2">
                    <span className="text-emerald-400">•</span>
                    <span><strong>Scarce assets:</strong> Gold, Bitcoin - cannot be printed</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-emerald-400">•</span>
                    <span><strong>Energy/Commodities:</strong> Essential inputs that rise with inflation</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-emerald-400">•</span>
                    <span><strong>Prime residential real estate:</strong> Tangible, holds value</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-emerald-400">•</span>
                    <span><strong>Some cash:</strong> For buying opportunities during panic</span>
                  </li>
                </ul>
              </div>
              
              <div className="bg-red-950/30 border border-red-600/50 rounded-xl p-5">
                <h3 className="font-bold text-red-400 mb-4">Consider Avoiding</h3>
                <ul className="space-y-3 text-sm text-zinc-300">
                  <li className="flex gap-2">
                    <span className="text-red-400">•</span>
                    <span><strong>Excess cash:</strong> Fuel being burned to keep system running</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-red-400">•</span>
                    <span><strong>Long-term bonds:</strong> 30-year Treasuries get crushed by inflation</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-red-400">•</span>
                    <span><strong>Commercial office exposure:</strong> Zombie assets for years</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-red-400">•</span>
                    <span><strong>Fixed income:</strong> Returns eaten by real inflation</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="bg-red-950/40 border-2 border-red-600 rounded-xl p-6">
              <h3 className="font-bold text-xl text-red-400 mb-4">
                If Triggers Hit (MOVE above 100 AND SOFR spread persists above 20bps)
              </h3>
              <ol className="space-y-4 text-zinc-300">
                <li className="flex gap-3">
                  <span className="font-bold text-red-400">1.</span>
                  <div>
                    <strong>Do not trust the first green day.</strong>
                    <p className="text-sm text-zinc-400 mt-1">
                      If stocks rally the day after a trigger, it is likely the Bull Trap. Smart money is selling into strength.
                    </p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="font-bold text-red-400">2.</span>
                  <div>
                    <strong>Watch the Friday close.</strong>
                    <p className="text-sm text-zinc-400 mt-1">
                      A weak Friday close after a trigger = extreme risk of a Monday morning gap down. Weekend failures are common.
                    </p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="font-bold text-red-400">3.</span>
                  <div>
                    <strong>Apply the 3-Day Rule.</strong>
                    <p className="text-sm text-zinc-400 mt-1">
                      If HYG/LQD ratio falls for 3 consecutive days, the equity flush has begun. The lag is over.
                    </p>
                  </div>
                </li>
              </ol>
            </div>

            <div className="bg-zinc-800/50 rounded-lg p-4 text-xs text-zinc-500">
              <strong>Disclaimer:</strong> This is educational content, not financial advice. 
              Past patterns do not guarantee future outcomes. Consult a qualified financial advisor 
              before making investment decisions.
            </div>
          </div>
        )}
      </main>

      <footer className="border-t border-zinc-800 mt-12">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between text-xs text-zinc-600 flex-wrap gap-4">
            <div>Crisis Monitor by Sparkwave AI | Educational purposes only | Not financial advice</div>
            <div>Data: Federal Reserve, FRED, Trepp, ICE BofA</div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default CrisisMonitor;
