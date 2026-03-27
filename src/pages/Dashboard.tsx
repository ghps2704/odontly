
import React, { useMemo } from 'react';
import { useNexus } from '@/contexts/NexusContext';
import { ArrowUpRight, AlertTriangle, TrendingDown, Clock, BarChart3, TrendingUp, DollarSign, PieChart as PieIcon, Activity, UserPlus, Users, Wallet, Trophy, ShoppingBag, Gauge, Heart } from 'lucide-react';
import { ViewState } from '@/types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, Area, AreaChart, Treemap, ComposedChart, Line } from 'recharts';

const Dashboard: React.FC<{ onNavigate: (view: ViewState) => void }> = ({ onNavigate }) => {
  const { transactions, items, accounts, appointments, contacts, settings, professionals } = useNexus();

  const revenueHistory = useMemo(() => {
    const data = [];
    const today = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthName = d.toLocaleDateString('pt-BR', { month: 'short' });
      const year = d.getFullYear();
      const monthIncome = transactions.filter(t => {
        const tDate = new Date(t.date);
        return t.type === 'INCOME' && tDate.getMonth() === d.getMonth() && tDate.getFullYear() === year;
      }).reduce((acc, t) => acc + t.amount, 0);
      const monthExpense = transactions.filter(t => {
        const tDate = new Date(t.date);
        return t.type === 'EXPENSE' && tDate.getMonth() === d.getMonth() && tDate.getFullYear() === year;
      }).reduce((acc, t) => acc + t.amount, 0);
      data.push({ name: monthName, Receita: monthIncome, Despesa: monthExpense, Lucro: monthIncome - monthExpense });
    }
    return data;
  }, [transactions]);

  const forecastData = useMemo(() => {
    let currentBalance = accounts.reduce((acc, a) => acc + a.balance, 0);
    const today = new Date();
    const next30Days = new Date();
    next30Days.setDate(today.getDate() + 30);
    const futureTxs = transactions
      .filter(t => t.status === 'PENDING' && new Date(t.date) >= today && new Date(t.date) <= next30Days)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const data = [{ name: 'Hoje', Saldo: currentBalance }];
    futureTxs.forEach(tx => {
      if (tx.type === 'INCOME') currentBalance += tx.amount;
      else currentBalance -= tx.amount;
      data.push({ name: new Date(tx.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }), Saldo: currentBalance });
    });
    return data;
  }, [transactions, accounts]);

  const paymentMixData = useMemo(() => {
    const mix: Record<string, number> = {};
    transactions.filter(t => t.type === 'INCOME' && t.status === 'PAID').forEach(t => {
      const method = t.paymentMethod || 'OUTRO';
      mix[method] = (mix[method] || 0) + t.amount;
    });
    return Object.entries(mix).map(([name, value]) => ({ name, value }));
  }, [transactions]);

  const COLORS = ['#0284c7', '#0ea5e9', '#38bdf8', '#7dd3fc', '#bae6fd', '#e0f2fe'];

  const kpis = useMemo(() => {
    const now = new Date();
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(now.getMonth() - 6);
    const marketingExpenses = transactions.filter(t =>
      t.type === 'EXPENSE' &&
      (t.category.toLowerCase().includes('marketing') || t.category.toLowerCase().includes('publicidade')) &&
      new Date(t.date) >= sixMonthsAgo
    ).reduce((acc, t) => acc + t.amount, 0);
    const newClientsCount = contacts.filter(c => {
      if (c.type === 'SUPPLIER') return false;
      const clientAppts = appointments.filter(a => a.clientId === c.id);
      if (clientAppts.length === 0) return false;
      return new Date(clientAppts[0].date) >= sixMonthsAgo;
    }).length;
    const cac = newClientsCount > 0 ? marketingExpenses / newClientsCount : 0;
    const totalRevenue = transactions.filter(t => t.type === 'INCOME' && t.status === 'PAID').reduce((acc, t) => acc + t.amount, 0);
    const uniquePayingClients = new Set(transactions.filter(t => t.type === 'INCOME' && t.status === 'PAID' && t.contactId).map(t => t.contactId)).size;
    const ltv = uniquePayingClients > 0 ? totalRevenue / uniquePayingClients : 0;
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(now.getDate() - 90);
    const activeClientsSet = new Set(appointments.filter(a => new Date(a.date) >= ninetyDaysAgo).map(a => a.clientId));
    const totalEngagedClients = new Set(appointments.map(a => a.clientId)).size;
    const churnRate = totalEngagedClients > 0 ? ((totalEngagedClients - activeClientsSet.size) / totalEngagedClients) * 100 : 0;
    return { cac, ltv, churnRate };
  }, [transactions, appointments, contacts]);

  const abcTreemapData = useMemo(() => {
    const stockItems = items.filter(i => i.type !== 'SERVICE');
    const totalValue = stockItems.reduce((acc, i) => acc + (i.cost * i.stock), 0);
    const sorted = [...stockItems].sort((a, b) => (b.cost * b.stock) - (a.cost * a.stock));
    const thresholds = settings.abcThresholds || { a: 70, b: 20, c: 10 };
    const colors = ['#0284c7', '#0ea5e9', '#bae6fd'];
    let accumulated = 0;
    const data = [
      { name: 'Classe A', children: [] as any[] },
      { name: 'Classe B', children: [] as any[] },
      { name: 'Classe C', children: [] as any[] },
    ];
    sorted.forEach(item => {
      const itemVal = item.cost * item.stock;
      if (itemVal <= 0) return;
      accumulated += itemVal;
      const pct = (accumulated / totalValue) * 100;
      let targetIndex = 2;
      if (pct <= thresholds.a) targetIndex = 0;
      else if (pct <= (thresholds.a + thresholds.b)) targetIndex = 1;
      data[targetIndex].children.push({ name: item.name, size: itemVal, value: itemVal, nodeColor: colors[targetIndex] });
    });
    return data.filter(d => d.children.length > 0);
  }, [items, settings.abcThresholds]);

  const performanceData = useMemo(() => {
    const profMap: Record<string, { name: string; revenue: number; appointmentsCount: number; productsCount: number }> = {};
    const itemMap: Record<string, { name: string; value: number; count: number }> = {};
    appointments.filter(a => a.status === 'COMPLETED').forEach(appt => {
      const profId = appt.professionalId;
      const profName = professionals.find(p => p.id === profId)?.name || 'Profissional Removido';
      if (!profMap[profId]) profMap[profId] = { name: profName, revenue: 0, appointmentsCount: 0, productsCount: 0 };
      profMap[profId].appointmentsCount += 1;
      if (appt.items) {
        appt.items.forEach(itm => {
          const lineTotal = itm.quantity * itm.unitPrice;
          const itemDef = items.find(i => i.id === itm.itemId);
          profMap[profId].revenue += lineTotal;
          if (itemDef?.type === 'PRODUCT') profMap[profId].productsCount += itm.quantity;
          const itemName = itemDef?.name || 'Item Removido';
          if (!itemMap[itm.itemId]) itemMap[itm.itemId] = { name: itemName, value: 0, count: 0 };
          itemMap[itm.itemId].value += lineTotal;
          itemMap[itm.itemId].count += itm.quantity;
        });
      }
    });
    return { profChart: Object.values(profMap).sort((a, b) => b.revenue - a.revenue), itemChart: Object.values(itemMap).sort((a, b) => b.value - a.value).slice(0, 10) };
  }, [appointments, professionals, items]);

  const opsMetrics = useMemo(() => {
    const activeProfs = professionals.filter(p => p.active).length;
    const totalCapacityHours = activeProfs * 8 * 22;
    const currentMonth = new Date().getMonth();
    const bookedHours = appointments.filter(a => new Date(a.date).getMonth() === currentMonth && a.status !== 'CANCELLED').reduce((acc, a) => acc + (a.durationMinutes / 60), 0);
    const occupancyRate = totalCapacityHours > 0 ? (bookedHours / totalCapacityHours) * 100 : 0;
    const ratedAppts = appointments.filter(a => a.npsScore !== undefined);
    const avgNps = ratedAppts.length > 0 ? ratedAppts.reduce((acc, a) => acc + (a.npsScore || 0), 0) / ratedAppts.length : 0;
    const totalWasteValue = appointments.filter(a => a.status === 'COMPLETED' && new Date(a.date).getMonth() === currentMonth && a.customMaterials).reduce((acc, a) => {
      const realCost = a.customMaterials?.reduce((sum, mat) => { const item = items.find(i => i.id === mat.itemId); return sum + (item ? item.cost * mat.quantity : 0); }, 0) || 0;
      const expectedCost = a.items.reduce((sum, saleItem) => {
        const itemDef = items.find(i => i.id === saleItem.itemId);
        if (itemDef?.bom) { const bomCost = itemDef.bom.reduce((bSum, bItem) => { const comp = items.find(k => k.id === bItem.itemId); return bSum + (comp ? comp.cost * bItem.quantity : 0); }, 0); return sum + (bomCost * saleItem.quantity); }
        return sum;
      }, 0);
      return acc + (realCost - expectedCost);
    }, 0);
    return { occupancyRate, avgNps, totalWasteValue };
  }, [appointments, professionals, items]);

  const revenue = transactions.filter(t => t.type === 'INCOME' && t.status === 'PAID').reduce((acc, curr) => acc + curr.amount, 0);
  const profit = revenue - transactions.filter(t => t.type === 'EXPENSE' && t.status === 'PAID').reduce((acc, curr) => acc + curr.amount, 0);
  const lowStockItems = items.filter(i => i.type !== 'SERVICE' && i.stock <= i.minStock);

  // Shared styles
  const card: React.CSSProperties = {
    background: '#ffffff',
    border: '0.5px solid #e0f2fe',
    borderRadius: 14,
    padding: '16px 20px',
    transition: 'border-color 0.15s',
  };
  const surfaceCard: React.CSSProperties = {
    background: '#f0f9ff',
    border: '0.5px solid #e0f2fe',
    borderRadius: 14,
    padding: '16px 20px',
  };
  const sectionTitle: React.CSSProperties = {
    fontSize: 15,
    fontWeight: 500,
    color: '#0a0f1e',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  };

  const MetricCard = ({ title, value, subtext, icon: Icon, accent }: any) => (
    <div
      style={{ ...surfaceCard, cursor: 'pointer', borderLeft: `3px solid ${accent || '#0284c7'}`, paddingLeft: 17, display: 'flex', flexDirection: 'column', gap: 4 }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <p style={{ fontSize: 12, color: '#64748b', fontWeight: 400 }}>{title}</p>
        <div style={{ padding: 6, background: '#e0f2fe', borderRadius: 8, color: '#0284c7' }}>
          <Icon size={16} />
        </div>
      </div>
      <h3 style={{ fontSize: 26, fontWeight: 600, color: '#0a0f1e', lineHeight: 1.1 }}>{value}</h3>
      {subtext && <p style={{ fontSize: 11, color: '#64748b' }}>{subtext}</p>}
    </div>
  );

  const CustomTreemapContent = (props: any) => {
    const { depth, x, y, width, height, name, nodeColor } = props;
    return (
      <g>
        <rect x={x} y={y} width={width} height={height} style={{ fill: depth === 1 ? 'transparent' : nodeColor, stroke: '#fff', strokeWidth: 2 / (depth + 1e-10), strokeOpacity: 1 / (depth + 1e-10) }} />
        {depth === 1 ? <text x={x + width / 2} y={y + height / 2 + 7} textAnchor="middle" fill="#fff" fontSize={13} fontWeight="600">{name}</text> : null}
        {depth === 2 && width > 30 && height > 20 ? <text x={x + 4} y={y + 14} fill="#fff" fontSize={10} fillOpacity={0.9}>{name}</text> : null}
      </g>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28, fontFamily: 'Inter, sans-serif' }}>

      {/* Header */}
      <div>
        <h2 style={{ fontSize: 22, fontWeight: 500, color: '#0a0f1e', letterSpacing: '-0.02em' }}>Painel de Controle</h2>
        <p style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>Visão geral da operação da sua clínica.</p>
      </div>

      {/* Top KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <div onClick={() => onNavigate('FINANCE')} style={{ cursor: 'pointer' }}>
          <MetricCard title="Receita Acumulada" value={`R$ ${revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} subtext="Regime de caixa" icon={ArrowUpRight} accent="#0284c7" />
        </div>
        <div onClick={() => onNavigate('FINANCE')} style={{ cursor: 'pointer' }}>
          <MetricCard title="Lucro Líquido" value={`R$ ${profit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} subtext={`Margem: ${revenue > 0 ? ((profit / revenue) * 100).toFixed(1) : 0}%`} icon={TrendingUp} accent="#16a34a" />
        </div>
        <div onClick={() => onNavigate('CATALOG')} style={{ cursor: 'pointer' }}>
          <MetricCard title="Estoque Crítico" value={lowStockItems.length} subtext="Itens abaixo do mínimo" icon={AlertTriangle} accent="#dc2626" />
        </div>
        <div onClick={() => onNavigate('FINANCE')} style={{ cursor: 'pointer' }}>
          <MetricCard title="Saldo em Contas" value={`R$ ${accounts.reduce((a, b) => a + b.balance, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} subtext="Tesouraria consolidada" icon={Wallet} accent="#0284c7" />
        </div>
      </div>

      {/* Eficiência Operacional */}
      <div>
        <h3 style={sectionTitle}>
          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, background: '#e0f2fe', borderRadius: 6 }}>
            <Gauge size={13} style={{ color: '#0284c7' }} />
          </span>
          Eficiência Operacional
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div style={{ ...card, display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ padding: 10, background: '#e0f2fe', borderRadius: '50%', color: '#0284c7', flexShrink: 0 }}><Clock size={20} /></div>
            <div>
              <p style={{ fontSize: 12, color: '#64748b' }}>Ocupação da Agenda</p>
              <h4 style={{ fontSize: 22, fontWeight: 600, color: '#0a0f1e' }}>{opsMetrics.occupancyRate.toFixed(1)}%</h4>
              <p style={{ fontSize: 11, color: '#64748b' }}>Horas vendidas / capacidade</p>
            </div>
          </div>
          <div style={{ ...card, display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ padding: 10, background: opsMetrics.totalWasteValue > 0 ? '#fee2e2' : '#dcfce7', borderRadius: '50%', color: opsMetrics.totalWasteValue > 0 ? '#dc2626' : '#16a34a', flexShrink: 0 }}><TrendingDown size={20} /></div>
            <div>
              <p style={{ fontSize: 12, color: '#64748b' }}>Variância de Insumos</p>
              <h4 style={{ fontSize: 22, fontWeight: 600, color: opsMetrics.totalWasteValue > 0 ? '#dc2626' : '#16a34a' }}>
                {opsMetrics.totalWasteValue > 0 ? '+' : ''}R$ {opsMetrics.totalWasteValue.toFixed(2)}
              </h4>
              <p style={{ fontSize: 11, color: '#64748b' }}>Real vs. ficha técnica</p>
            </div>
          </div>
          <div style={{ ...card, display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ padding: 10, background: '#e0f2fe', borderRadius: '50%', color: '#0284c7', flexShrink: 0 }}><Heart size={20} /></div>
            <div>
              <p style={{ fontSize: 12, color: '#64748b' }}>NPS Médio</p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                <h4 style={{ fontSize: 22, fontWeight: 600, color: '#0a0f1e' }}>{opsMetrics.avgNps.toFixed(1)}</h4>
                <span style={{ fontSize: 11, color: '#64748b' }}>/ 10</span>
              </div>
              <p style={{ fontSize: 11, color: '#64748b' }}>Avaliações no checkout</p>
            </div>
          </div>
        </div>
      </div>

      {/* Economia Unitária */}
      <div>
        <h3 style={sectionTitle}>
          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, background: '#e0f2fe', borderRadius: 6 }}>
            <Activity size={13} style={{ color: '#0284c7' }} />
          </span>
          Economia Unitária (KPIs)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            { label: 'CAC (Custo de Aquisição)', value: `R$ ${kpis.cac.toFixed(2)}`, sub: 'Marketing / Novos pacientes (6m)', icon: UserPlus },
            { label: 'LTV (Lifetime Value)', value: `R$ ${kpis.ltv.toFixed(2)}`, sub: 'Receita média vitalícia', icon: DollarSign },
            { label: 'Churn Rate', value: `${kpis.churnRate.toFixed(1)}%`, sub: 'Inativos > 90 dias', icon: Users },
          ].map(({ label, value, sub, icon: Icon }) => (
            <div key={label} style={card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 12, color: '#64748b' }}>{label}</span>
                <Icon size={16} style={{ color: '#0284c7' }} />
              </div>
              <div style={{ fontSize: 22, fontWeight: 600, color: '#0a0f1e' }}>{value}</div>
              <p style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>{sub}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Performance Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div style={{ ...card, height: 340 }}>
          <h3 style={sectionTitle}>
            <Trophy size={15} style={{ color: '#0284c7' }} /> Performance por Profissional
          </h3>
          <ResponsiveContainer width="100%" height="85%">
            <ComposedChart data={performanceData.profChart} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f9ff" />
              <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis yAxisId="left" fontSize={10} tickLine={false} axisLine={false} tickFormatter={val => `R$${val}`} />
              <YAxis yAxisId="right" orientation="right" fontSize={10} tickLine={false} axisLine={false} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar yAxisId="left" dataKey="revenue" name="Receita" fill="#0284c7" radius={[4, 4, 0, 0]} barSize={18} />
              <Bar yAxisId="right" dataKey="appointmentsCount" name="Atendimentos" fill="#bae6fd" radius={[4, 4, 0, 0]} barSize={18} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <div style={{ ...card, height: 340 }}>
          <h3 style={sectionTitle}>
            <ShoppingBag size={15} style={{ color: '#0284c7' }} /> Top 10 Produtos & Serviços
          </h3>
          <ResponsiveContainer width="100%" height="85%">
            <ComposedChart data={performanceData.itemChart} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f9ff" />
              <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} interval={0} angle={-15} textAnchor="end" height={40} />
              <YAxis yAxisId="left" fontSize={10} tickLine={false} axisLine={false} tickFormatter={val => `R$${val}`} />
              <YAxis yAxisId="right" orientation="right" fontSize={10} tickLine={false} axisLine={false} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar yAxisId="left" dataKey="value" name="Receita" fill="#0284c7" radius={[4, 4, 0, 0]} barSize={28} />
              <Line yAxisId="right" dataKey="count" name="Quantidade" type="monotone" stroke="#0ea5e9" strokeWidth={2} dot={{ r: 3 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Revenue + Forecast */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div style={{ ...card, height: 300 }}>
          <h3 style={sectionTitle}><BarChart3 size={15} style={{ color: '#0284c7' }} /> Faturamento Mensal</h3>
          <ResponsiveContainer width="100%" height="82%">
            <BarChart data={revenueHistory}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f9ff" />
              <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="Receita" fill="#0284c7" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Lucro" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={{ ...card, height: 300 }}>
          <h3 style={sectionTitle}><TrendingUp size={15} style={{ color: '#0284c7' }} /> Projeção de Caixa (30 dias)</h3>
          <ResponsiveContainer width="100%" height="82%">
            <AreaChart data={forecastData}>
              <defs>
                <linearGradient id="colorSaldo" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0284c7" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#0284c7" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f9ff" />
              <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip formatter={(value: any) => [`R$ ${value.toFixed(2)}`, 'Saldo Previsto']} />
              <Area type="monotone" dataKey="Saldo" stroke="#0284c7" strokeWidth={2} fillOpacity={1} fill="url(#colorSaldo)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Payment Mix + ABC */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div style={{ ...card, height: 340 }}>
          <h3 style={sectionTitle}><DollarSign size={15} style={{ color: '#0284c7' }} /> Mix de Recebimentos</h3>
          <ResponsiveContainer width="100%" height="85%">
            <PieChart>
              <Pie data={paymentMixData} cx="50%" cy="50%" innerRadius={55} outerRadius={75} paddingAngle={4} dataKey="value">
                {paymentMixData.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(val: number) => `R$ ${val.toFixed(2)}`} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div style={{ ...card, height: 340, gridColumn: 'span 2' }} className="lg:col-span-2">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ ...sectionTitle, marginBottom: 0 }}><PieIcon size={15} style={{ color: '#0284c7' }} /> Curva ABC (Estoque)</h3>
            <div style={{ display: 'flex', gap: 10, fontSize: 11, color: '#64748b' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 10, background: '#0284c7', borderRadius: 2, display: 'inline-block' }} /> A ({settings.abcThresholds?.a}%)</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 10, background: '#0ea5e9', borderRadius: 2, display: 'inline-block' }} /> B ({settings.abcThresholds?.b}%)</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 10, background: '#bae6fd', borderRadius: 2, display: 'inline-block' }} /> C ({settings.abcThresholds?.c}%)</span>
            </div>
          </div>
          <div style={{ flex: 1, width: '100%', height: 'calc(100% - 36px)' }}>
            <ResponsiveContainer width="100%" height="100%">
              <Treemap data={abcTreemapData} dataKey="size" aspectRatio={4 / 3} stroke="#fff" content={<CustomTreemapContent />}>
                <Tooltip formatter={(value: any) => `R$ ${value.toFixed(2)}`} />
              </Treemap>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

    </div>
  );
};

export default Dashboard;
