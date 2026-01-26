import StudioLayout from '@/components/StudioLayout';

export default function StudioRootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <StudioLayout>{children}</StudioLayout>;
}
