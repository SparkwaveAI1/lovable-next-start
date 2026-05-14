import { Building2, CalendarCheck2, CheckCircle2, Clock3, Home, MessageSquare, Phone, Search, Sparkles, UserRound, Users } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageContent, PageHeader } from '@/components/layout/PageLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const pipelineStages = [
  { label: 'Novo lead', count: 8, description: 'Portais, WhatsApp e Instagram' },
  { label: 'Qualificando', count: 5, description: 'Perfil, orçamento e região' },
  { label: 'Visita marcada', count: 3, description: 'Agendamentos desta semana' },
  { label: 'Proposta', count: 2, description: 'Negociação / documentação' },
];

const leadRows = [
  { name: 'Mariana Costa', need: 'Apartamento 2 quartos em Boa Viagem', source: 'Instagram', status: 'Visita amanhã', owner: 'Elisa' },
  { name: 'Rafael Lima', need: 'Casa em condomínio até R$ 850k', source: 'WhatsApp', status: 'Enviar opções', owner: 'Luna (Walter)' },
  { name: 'Patrícia Gomes', need: 'Avaliar imóvel para venda', source: 'Indicação', status: 'Aguardando documentos', owner: 'Elisa' },
  { name: 'Bruno Andrade', need: 'Investimento para aluguel anual', source: 'Portal', status: 'Qualificar orçamento', owner: 'Luna (Walter)' },
];

const properties = [
  { title: 'Apartamento vista mar', neighborhood: 'Boa Viagem', price: 'R$ 720k', fit: 'Casal com 1 filho', next: 'Mandar vídeo tour' },
  { title: 'Casa em condomínio', neighborhood: 'Aldeia', price: 'R$ 890k', fit: 'Família procurando área verde', next: 'Confirmar disponibilidade' },
  { title: 'Studio mobiliado', neighborhood: 'Pina', price: 'R$ 390k', fit: 'Investidor / aluguel short stay', next: 'Checar documentação' },
];

const followUps = [
  { task: 'Confirmar visita com Mariana', due: 'Hoje 16:00', channel: 'WhatsApp', priority: 'Alta' },
  { task: 'Enviar 3 imóveis para Rafael', due: 'Hoje', channel: 'WhatsApp', priority: 'Alta' },
  { task: 'Pedir matrícula atualizada de Patrícia', due: 'Amanhã', channel: 'Telefone', priority: 'Média' },
  { task: 'Preparar resumo semanal de leads', due: 'Sexta', channel: 'Dashboard', priority: 'Média' },
];

const futureBlocks = [
  'Research agent: análise de bairros, preço médio e comparáveis antes de visitas.',
  'Expanded Luna communications: rascunhos de WhatsApp/e-mail para aprovação de Elisa.',
  'Remote Walter-server runtime: Luna aparece aqui como integração externa, não como agente local do Rico.',
];

export default function ElisaVerasClientModule() {
  return (
    <DashboardLayout businessName="Elisa Veras Imóveis" hideBreadcrumbs>
      <PageContent fullWidth className="max-w-7xl mx-auto">
        <PageHeader
          title="Elisa Veras Imóveis"
          description="Client business module shell for real-estate CRM, properties, follow-ups, and Walter-side Luna coordination."
          actions={
            <div className="flex flex-wrap gap-2">
              <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Client workspace</Badge>
              <Badge variant="outline">Luna: remote Walter server only</Badge>
            </div>
          }
        />

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {pipelineStages.map(stage => (
            <Card key={stage.label}>
              <CardHeader className="pb-2">
                <CardDescription>{stage.label}</CardDescription>
                <CardTitle className="text-3xl">{stage.count}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">{stage.description}</CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[1.5fr_1fr]">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5 text-indigo-600" /> Lead/contact CRM</CardTitle>
                  <CardDescription>Simple operating view for Elisa leads, clients, sources, and next action ownership.</CardDescription>
                </div>
                <div className="relative w-full md:w-72">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input className="pl-9" placeholder="Search leads, needs, source" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-hidden rounded-lg border">
                <div className="grid grid-cols-5 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <span>Contact</span>
                  <span className="col-span-2">Need / property brief</span>
                  <span>Status</span>
                  <span>Owner</span>
                </div>
                {leadRows.map(lead => (
                  <div key={lead.name} className="grid grid-cols-5 items-center gap-3 border-t px-4 py-3 text-sm">
                    <div>
                      <div className="font-medium text-slate-900">{lead.name}</div>
                      <div className="text-xs text-slate-500">{lead.source}</div>
                    </div>
                    <div className="col-span-2 text-slate-700">{lead.need}</div>
                    <Badge variant="outline" className="w-fit">{lead.status}</Badge>
                    <div className="text-slate-600">{lead.owner}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-indigo-600" /> Agent assignment</CardTitle>
              <CardDescription>Runtime boundary for the Elisa account.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                <div className="font-semibold text-amber-900">Luna is assigned on Walter only</div>
                <p className="mt-1 text-amber-800">This shell references Luna as a remote Walter-server integration. No local Rico-side Luna, Walter, or Jerry profile is created or used.</p>
              </div>
              <div className="grid gap-3">
                <div className="flex items-center gap-3"><UserRound className="h-4 w-4 text-slate-500" /> Elisa owns client decisions and property approvals.</div>
                <div className="flex items-center gap-3"><MessageSquare className="h-4 w-4 text-slate-500" /> Luna drafts communications after approval gates are defined.</div>
                <div className="flex items-center gap-3"><Phone className="h-4 w-4 text-slate-500" /> Customer-facing sends stay disabled until explicit approval.</div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="properties" className="mt-6">
          <TabsList>
            <TabsTrigger value="properties">Properties</TabsTrigger>
            <TabsTrigger value="followups">Follow-ups</TabsTrigger>
            <TabsTrigger value="future">Future integrations</TabsTrigger>
          </TabsList>
          <TabsContent value="properties" className="mt-4">
            <div className="grid gap-4 lg:grid-cols-3">
              {properties.map(property => (
                <Card key={property.title}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base"><Home className="h-4 w-4 text-indigo-600" /> {property.title}</CardTitle>
                    <CardDescription>{property.neighborhood} · {property.price}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div><span className="font-medium">Best fit:</span> {property.fit}</div>
                    <div><span className="font-medium">Next:</span> {property.next}</div>
                    <Button variant="outline" size="sm" className="w-full">Open listing context</Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
          <TabsContent value="followups" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><CalendarCheck2 className="h-5 w-5 text-indigo-600" /> Task/follow-up queue</CardTitle>
                <CardDescription>Operational next actions for leads and listings.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3">
                {followUps.map(item => (
                  <div key={item.task} className="flex flex-col gap-2 rounded-lg border p-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="font-medium text-slate-900">{item.task}</div>
                      <div className="flex items-center gap-2 text-sm text-slate-500"><Clock3 className="h-4 w-4" /> {item.due} · {item.channel}</div>
                    </div>
                    <Badge className={item.priority === 'Alta' ? 'bg-red-100 text-red-700 border-red-200' : 'bg-slate-100 text-slate-700 border-slate-200'}>{item.priority}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="future" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5 text-indigo-600" /> Planned module expansion</CardTitle>
                <CardDescription>Placeholders are visible without implying live automation.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3">
                {futureBlocks.map(block => (
                  <div key={block} className="flex gap-3 rounded-lg border p-4 text-sm text-slate-700">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-600" />
                    <span>{block}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </PageContent>
    </DashboardLayout>
  );
}
