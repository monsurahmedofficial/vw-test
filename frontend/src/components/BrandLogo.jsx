export default function BrandLogo({ size = 'md', className = '' }) {
  const sizes = {
    sm: { wrap: 'w-20 h-20 rounded-2xl', padding: 'p-1' },
    md: { wrap: 'w-24 h-24 rounded-2xl', padding: 'p-1.5' },
    lg: { wrap: 'w-36 h-36 rounded-3xl', padding: 'p-2' },
  };
  const selected = sizes[size] || sizes.md;

  return (
    <div className={`${selected.wrap} bg-white border border-gray-200 shadow-sm flex items-center justify-center shrink-0 overflow-hidden ${className}`}>
      <img
        src="/vapor-world-logo.png"
        alt="Vapor World"
        className={`w-full h-full object-contain ${selected.padding}`}
      />
    </div>
  );
}
