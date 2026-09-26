export function Card({
  className = "",
  style = {},
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-atlassian bg-white ${className}`}
      style={{ border: '1px solid #DFE1E6', ...style }}
      {...props}
    />
  );
}

export function CardHeader({
  className = "",
  style = {},
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div 
      className={`px-4 py-3 ${className}`}
      style={{ borderBottom: '1px solid #DFE1E6', ...style }}
      {...props}
    />
  );
}

export function CardTitle({
  className = "",
  style = {},
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 
      className={`text-sm font-semibold ${className}`}
      style={{ color: '#172B4D', ...style }}
      {...props}
    />
  );
}

export function CardContent({
  className = "",
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`p-4 ${className}`} {...props} />;
}

export function CardDescription({
  className = "",
  style = {},
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p 
      className={`text-sm mt-1 ${className}`}
      style={{ color: '#44546F', ...style }}
      {...props}
    />
  );
}
