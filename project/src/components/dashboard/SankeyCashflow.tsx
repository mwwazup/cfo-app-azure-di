import { Sankey, ResponsiveContainer, Tooltip } from 'recharts';
import { formatCurrency, formatPercentage } from './CashflowCalculator';

interface CashflowData {
  revenue: number;
  cogs: number;
  expenses: number;
  ownerDraws: number;
  taxes: number;
}

interface Calculations {
  totalCogs: number;
  totalExpenses: number;
  grossProfit: number;
  netBeforeOwnerPay: number;
  cashLeftInBusiness: number;
  grossProfitMargin: number;
  netBeforeOwnerMargin: number;
  ownerDistributionRate: number;
  cashLeftMargin: number;
}

interface SankeyCashflowProps {
  data: CashflowData;
  calculations: Calculations;
}

// Custom tooltip component
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    
    if (data.source !== undefined && data.target !== undefined) {
      // This is a link
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium text-foreground">
            {data.source.name} → {data.target.name}
          </p>
          <p className="text-sm text-accent">
            {formatCurrency(data.value)}
          </p>
          <p className="text-xs text-muted">
            {formatPercentage((data.value / data.sourceValue) * 100)} of source
          </p>
        </div>
      );
    } else {
      // This is a node
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium text-foreground">{data.name}</p>
          <p className="text-sm text-accent">{formatCurrency(data.value)}</p>
        </div>
      );
    }
  }
  return null;
};

// Custom node component with modern styling
const CustomNode = (props: any) => {
  const { x, y, width, height, payload, index } = props;
  
  // Validate coordinates to prevent NaN errors
  const safeX = isNaN(x) || !isFinite(x) ? 0 : x;
  const safeY = isNaN(y) || !isFinite(y) ? 0 : y;
  const safeWidth = isNaN(width) || !isFinite(width) || width <= 0 ? 100 : width;
  const safeHeight = isNaN(height) || !isFinite(height) || height <= 0 ? 30 : height;
  
  // Color scheme based on node type - matching app's gradient palette
  let gradientColors = { start: 'rgb(208 180 106 / 0.2)', end: 'rgb(208 180 106 / 0.1)' }; // Default accent gradient
  let textColor = '#1F2937';
  let strokeColor = 'rgb(208 180 106 / 0.3)';
  
  if (payload.name === 'Revenue') {
    gradientColors = { start: '#10B981', end: '#059669' };
    textColor = '#ECFDF5';
    strokeColor = '#059669';
  } else if (payload.name === 'Cash Left in Business') {
    // Gradient Gold (accent color)
    gradientColors = { start: '#F59E0B', end: '#D0B46A' };
    textColor = '#1F2937';
    strokeColor = '#D0B46A';
  } else if (payload.name === 'Owner Draws') {
    // Gradient Sapphire Blue
    gradientColors = { start: '#3B82F6', end: '#1E40AF' };
    textColor = '#EFF6FF';
    strokeColor = '#1E40AF';
  } else if (payload.name.includes('COGS')) {
    // Gradient White to Light Gray
    gradientColors = { start: '#F9FAFB', end: '#E5E7EB' };
    textColor = '#1F2937';
    strokeColor = '#9CA3AF';
  } else if (payload.name.includes('Operating')) {
    // Gradient Light Blue
    gradientColors = { start: '#60A5FA', end: '#3B82F6' };
    textColor = '#EFF6FF';
    strokeColor = '#3B82F6';
  } else if (payload.name.includes('Taxes')) {
    // Gradient Accent (matching your app style)
    gradientColors = { start: 'rgb(208 180 106 / 0.8)', end: 'rgb(208 180 106 / 0.4)' };
    textColor = '#1F2937';
    strokeColor = 'rgb(208 180 106 / 0.9)';
  }

  const gradientId = `gradient-${payload.name.replace(/\s+/g, '-')}-${index}`;

  return (
    <g key={`node-${index}`}>
      {/* Node rectangle with gradient */}
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={gradientColors.start} stopOpacity={0.9} />
          <stop offset="100%" stopColor={gradientColors.end} stopOpacity={0.8} />
        </linearGradient>
      </defs>
      
      <rect
        x={safeX}
        y={safeY}
        width={safeWidth}
        height={safeHeight}
        fill={`url(#${gradientId})`}
        stroke={strokeColor}
        strokeWidth={1.5}
        rx={6}
        className="transition-all duration-300 hover:opacity-90 drop-shadow-sm"
      />
      
      {/* Node label */}
      <text
        x={safeX + safeWidth / 2}
        y={safeY + safeHeight / 2 - 8}
        textAnchor="middle"
        fill={textColor}
        fontSize={12}
        fontWeight="600"
        className="pointer-events-none drop-shadow-sm"
      >
        {payload.name}
      </text>
      
      {/* Node value */}
      <text
        x={safeX + safeWidth / 2}
        y={safeY + safeHeight / 2 + 8}
        textAnchor="middle"
        fill={textColor}
        fontSize={10}
        fontWeight="500"
        className="pointer-events-none drop-shadow-sm"
      >
        {formatCurrency(payload.value || 0)}
      </text>
    </g>
  );
};

// Custom link component with modern gradient styling
const CustomLink = (props: any) => {
  const { sourceX, sourceY, sourceControlX, targetX, targetY, targetControlX, linkWidth, payload, index } = props;
  
  // Validate coordinates to prevent NaN errors
  const safeSourceX = isNaN(sourceX) || !isFinite(sourceX) ? 0 : sourceX;
  const safeSourceY = isNaN(sourceY) || !isFinite(sourceY) ? 0 : sourceY;
  const safeSourceControlX = isNaN(sourceControlX) || !isFinite(sourceControlX) ? safeSourceX + 50 : sourceControlX;
  const safeTargetX = isNaN(targetX) || !isFinite(targetX) ? 100 : targetX;
  const safeTargetY = isNaN(targetY) || !isFinite(targetY) ? 0 : targetY;
  const safeTargetControlX = isNaN(targetControlX) || !isFinite(targetControlX) ? safeTargetX - 50 : targetControlX;
  const safeLinkWidth = isNaN(linkWidth) || !isFinite(linkWidth) || linkWidth <= 0 ? 1 : linkWidth;
  
  // Color scheme for links based on target - matching app's gradient palette
  let linkGradient = { start: '#9CA3AF', end: '#6B7280' }; // Default gray gradient
  let linkOpacity = 0.7;
  
  if (payload.target && payload.target.name === 'Cash Left in Business') {
    // Gold gradient for money left in business
    linkGradient = { start: '#F59E0B', end: '#D0B46A' };
    linkOpacity = 0.8;
  } else if (payload.target && payload.target.name === 'Owner Draws') {
    // Sapphire blue gradient for owner distributions
    linkGradient = { start: '#3B82F6', end: '#1E40AF' };
    linkOpacity = 0.7;
  } else if (payload.target && payload.target.name.includes('COGS')) {
    // Light gray gradient for COGS
    linkGradient = { start: '#E5E7EB', end: '#9CA3AF' };
    linkOpacity = 0.6;
  } else if (payload.target && payload.target.name.includes('Operating')) {
    // Light blue gradient for operating expenses
    linkGradient = { start: '#60A5FA', end: '#3B82F6' };
    linkOpacity = 0.6;
  } else if (payload.target && payload.target.name.includes('Taxes')) {
    // Accent gradient for taxes
    linkGradient = { start: 'rgb(208 180 106 / 0.8)', end: 'rgb(208 180 106 / 0.4)' };
    linkOpacity = 0.7;
  }

  const path = `
    M${safeSourceX},${safeSourceY}
    C${safeSourceControlX},${safeSourceY} ${safeTargetControlX},${safeTargetY} ${safeTargetX},${safeTargetY}
  `;

  const gradientId = `link-gradient-${index}`;

  return (
    <g key={`link-${index}`}>
      {/* Link gradient */}
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={linkGradient.start} stopOpacity={linkOpacity * 0.8} />
          <stop offset="100%" stopColor={linkGradient.end} stopOpacity={linkOpacity} />
        </linearGradient>
      </defs>
      
      <path
        d={path}
        stroke={`url(#${gradientId})`}
        strokeWidth={safeLinkWidth}
        fill="none"
        className="transition-all duration-300 hover:opacity-95 drop-shadow-sm"
      />
    </g>
  );
};

export function SankeyCashflow({ data, calculations }: SankeyCashflowProps) {
  // Validate and sanitize data to prevent NaN errors
  const sanitizeValue = (value: number): number => {
    return isNaN(value) || !isFinite(value) || value < 0 ? 0 : value;
  };

  const sanitizedData = {
    revenue: sanitizeValue(data.revenue),
    totalCogs: sanitizeValue(data.cogs),
    totalExpenses: sanitizeValue(data.operatingExpenses),
    taxes: sanitizeValue(data.taxes),
    ownerDistributions: sanitizeValue(data.ownerDistributions),
    cashLeftInBusiness: sanitizeValue(calculations.cashLeftInBusiness)
  };

  // Transform data for Sankey diagram with validation
  const sankeyData = {
    nodes: [
      { id: 0, name: 'Revenue', value: sanitizedData.revenue },
      { id: 1, name: 'COGS', value: sanitizedData.totalCogs },
      { id: 2, name: 'Expenses', value: sanitizedData.totalExpenses },
      { id: 3, name: 'Taxes', value: sanitizedData.taxes },
      { id: 4, name: 'Owner Draws', value: sanitizedData.ownerDistributions },
      { id: 5, name: 'Cash Left in Business', value: sanitizedData.cashLeftInBusiness }
    ],
    links: [
      { 
        source: 0, 
        target: 1, 
        value: sanitizedData.totalCogs,
        sourceValue: sanitizedData.revenue
      },
      { 
        source: 0, 
        target: 2, 
        value: sanitizedData.totalExpenses,
        sourceValue: sanitizedData.revenue
      },
      { 
        source: 0, 
        target: 3, 
        value: sanitizedData.taxes,
        sourceValue: sanitizedData.revenue
      },
      { 
        source: 0, 
        target: 4, 
        value: sanitizedData.ownerDistributions,
        sourceValue: sanitizedData.revenue
      },
      { 
        source: 0, 
        target: 5, 
        value: sanitizedData.cashLeftInBusiness,
        sourceValue: sanitizedData.revenue
      }
    ].filter(link => link.value > 0) // Remove zero-value links
  };

  // Fallback if data is invalid or all values are zero
  if (!sanitizedData.revenue || sanitizedData.revenue <= 0) {
    return (
      <div className="w-full h-96 flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted text-sm">Enter revenue data to see cash flow visualization</p>
          <p className="text-xs text-muted mt-2">Adjust the values in the calculator above to see the money flow</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-96">
      <ResponsiveContainer width="100%" height="100%">
        <Sankey
          data={sankeyData}
          nodePadding={20}
          nodeWidth={120}
          linkCurvature={0.6}
          iterations={32}
          node={<CustomNode />}
          link={<CustomLink />}
        >
          <Tooltip content={<CustomTooltip />} />
        </Sankey>
      </ResponsiveContainer>
    </div>
  );
}

export default SankeyCashflow;
