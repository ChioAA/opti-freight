import Image from 'next/image';

export function Logo({ className, ...props }: { className?: string }) {
  return (
    <Image
      src="https://www.optifreight.io/_next/image?url=%2Fimages%2Flogos%2Flogo.png&w=256&q=75"
      alt="OptiFreight Logo"
      width={140}
      height={32}
      className={className}
      priority
      {...props}
    />
  );
}
