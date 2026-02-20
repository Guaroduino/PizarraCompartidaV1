
import React from 'react';

export type IconProps = React.SVGProps<SVGSVGElement>;

const BaseIcon: React.FC<IconProps> = ({ children, ...props }) => (
    <svg 
        xmlns="http://www.w3.org/2000/svg" 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        {...props}
    >
        {children}
    </svg>
);

export const IconDashboard: React.FC<IconProps> = (props) => (
    <BaseIcon {...props}>
        <rect width="7" height="9" x="3" y="3" rx="1" />
        <rect width="7" height="5" x="14" y="3" rx="1" />
        <rect width="7" height="9" x="14" y="12" rx="1" />
        <rect width="7" height="5" x="3" y="16" rx="1" />
    </BaseIcon>
);

export const IconSidebar: React.FC<IconProps> = (props) => (
    <BaseIcon {...props}>
        <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
        <line x1="15" x2="15" y1="3" y2="21" />
    </BaseIcon>
);

export const IconGrid: React.FC<IconProps> = (props) => (
    <BaseIcon {...props}>
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <line x1="3" y1="9" x2="21" y2="9" />
        <line x1="3" y1="15" x2="21" y2="15" />
        <line x1="9" y1="3" x2="9" y2="21" />
        <line x1="15" y1="3" x2="15" y2="21" />
    </BaseIcon>
);

export const IconMousePointer: React.FC<IconProps> = (props) => (
    <BaseIcon {...props}>
        <path d="m3 3 7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
        <path d="m13 13 6 6" />
    </BaseIcon>
);

export const IconScribble: React.FC<IconProps> = (props) => (
    <BaseIcon {...props}>
        <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
    </BaseIcon>
);

export const IconSquare: React.FC<IconProps> = (props) => (
    <BaseIcon {...props}>
        <rect x="3" y="3" width="18" height="18" rx="2" />
    </BaseIcon>
);

export const IconRectangle: React.FC<IconProps> = (props) => (
    <BaseIcon {...props}>
        <rect x="2" y="5" width="20" height="14" rx="2" />
    </BaseIcon>
);

export const IconParallelogram: React.FC<IconProps> = (props) => (
    <BaseIcon {...props}>
        <path d="M4 19h14.5L21 5H6.5z" />
    </BaseIcon>
);

export const IconFill: React.FC<IconProps> = (props) => (
    <BaseIcon {...props}>
        <path d="M21.1 10.3 12 19.4 4.6 12 13.7 2.9a2 2 0 0 1 2.8 0l4.6 4.6a2 2 0 0 1 0 2.8z" />
        <path d="m19 12-7 7" />
    </BaseIcon>
);

export const IconHand: React.FC<IconProps> = (props) => (
    <BaseIcon {...props}>
        <path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0" />
        <path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2" />
        <path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8" />
        <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" />
    </BaseIcon>
);

export const IconLasso: React.FC<IconProps> = (props) => (
    <BaseIcon {...props}>
        <path d="M7 22a5 5 0 0 1-2-4" />
        <path d="M3.3 14A5 5 0 0 1 7 2" />
        <path d="M17 2a5 5 0 0 1 4.7 12" />
        <path d="M22 18a5 5 0 0 1-5 4" />
        <path d="M13.2 18a4 4 0 0 1-3.4-3.2c-1.3-5.2 6.6-7.3 5.4-1.2" />
    </BaseIcon>
);

export const IconSliders: React.FC<IconProps> = (props) => (
    <BaseIcon {...props}>
        <line x1="4" x2="4" y1="21" y2="14" />
        <line x1="4" x2="4" y1="10" y2="3" />
        <line x1="12" x2="12" y1="21" y2="12" />
        <line x1="12" x2="12" y1="8" y2="3" />
        <line x1="20" x2="20" y1="21" y2="16" />
        <line x1="20" x2="20" y1="12" y2="3" />
        <line x1="1" x2="7" y1="14" y2="14" />
        <line x1="9" x2="15" y1="8" y2="8" />
        <line x1="17" x2="23" y1="16" y2="16" />
    </BaseIcon>
);

export const IconGroup: React.FC<IconProps> = (props) => (
    <BaseIcon {...props}>
        <rect x="3" y="7" width="18" height="13" rx="2" />
        <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </BaseIcon>
);

export const IconUngroup: React.FC<IconProps> = (props) => (
    <BaseIcon {...props}>
        <rect width="8" height="6" x="5" y="4" rx="1" />
        <rect width="8" height="6" x="11" y="14" rx="1" />
    </BaseIcon>
);

export const IconLayers: React.FC<IconProps> = (props) => (
    <BaseIcon {...props}>
        <path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z" />
        <path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65" />
        <path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65" />
    </BaseIcon>
);

export const IconEye: React.FC<IconProps> = (props) => (
    <BaseIcon {...props}>
        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7-10-7Z" />
        <circle cx="12" cy="12" r="3" />
    </BaseIcon>
);

export const IconEyeSlash: React.FC<IconProps> = (props) => (
    <BaseIcon {...props}>
        <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
        <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
        <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7c.44 0 .87-.03 1.28-.09" />
        <line x1="2" x2="22" y1="2" y2="22" />
    </BaseIcon>
);

export const IconUndo: React.FC<IconProps> = (props) => (
    <BaseIcon {...props}>
        <path d="M3 7v6h6" />
        <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
    </BaseIcon>
);

export const IconRedo: React.FC<IconProps> = (props) => (
    <BaseIcon {...props}>
        <path d="M21 7v6h-6" />
        <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7" />
    </BaseIcon>
);

export const IconDropper: React.FC<IconProps> = (props) => (
    <BaseIcon {...props}>
        <path d="m14 6 7.7-7.7a2.12 2.12 0 0 1 3 3L17 9" />
        <path d="M15.1 12.3a4 4 0 0 0-5.6 0L2 19.8l1.3 1.3c.3-.9.8-1.6 1.9-1.9l7.6-7.5a2 2 0 0 1 2.3-.4" />
    </BaseIcon>
);

export const IconCrop: React.FC<IconProps> = (props) => (
    <BaseIcon {...props}>
        <path d="M6 2v14a2 2 0 0 0 2 2h14" />
        <path d="M18 22V8a2 2 0 0 0-2-2H2" />
    </BaseIcon>
);

export const IconArrowsExpand: React.FC<IconProps> = (props) => (
    <BaseIcon {...props}>
        <path d="m21 21-6-6m6 6v-4.8m0 4.8h-4.8" />
        <path d="M3 16.2V21m0 0h4.8M3 21l6-6" />
        <path d="M21 7.8V3m0 0h-4.8M21 3l-6 6" />
        <path d="M3 7.8V3m0 0h4.8M3 3l6 6" />
    </BaseIcon>
);

export const IconCloud: React.FC<IconProps> = (props) => (
    <BaseIcon {...props}>
        <path d="M17.5 19c0-1.7-1.3-3-3-3h-1.1c-.5-3.3-3.4-6-7-6-3.9 0-7 3.1-7 7s3.1 7 7 7h8.5c1.7 0 3-1.3 3-3z" />
    </BaseIcon>
);

export const IconCloudOff: React.FC<IconProps> = (props) => (
    <BaseIcon {...props}>
        <path d="m2 2 20 20" />
        <path d="M5.782 5.782A7 7 0 0 0 9 19h8.5a3 3 0 0 0 1.946-5.284" />
        <path d="M17.5 19c0-1.7-1.3-3-3-3h-1.1c-.077-.507-.256-.98-.514-1.404" />
        <path d="M11.66 6.31A7.001 7.001 0 0 1 13.4 17" />
    </BaseIcon>
);

export const IconFeed: React.FC<IconProps> = (props) => (
    <BaseIcon {...props}>
        <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
        <line x1="3" x2="21" y1="9" y2="9" />
        <line x1="9" x2="9" y1="21" y2="9" />
    </BaseIcon>
);

export const IconBook: React.FC<IconProps> = (props) => (
    <BaseIcon {...props}>
        <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
    </BaseIcon>
);

export const IconClipboard: React.FC<IconProps> = (props) => (
    <BaseIcon {...props}>
        <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
        <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    </BaseIcon>
);

export const IconClipboardCopy: React.FC<IconProps> = (props) => (
    <BaseIcon {...props}>
        <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
        <path d="M8 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
        <path d="M16 4h2a2 2 0 0 1 2 2v4" />
        <path d="M21 14H11" />
        <path d="m15 10-4 4 4 4" />
    </BaseIcon>
);

export const IconProject: React.FC<IconProps> = (props) => (
    <BaseIcon {...props}>
        <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
        <path d="M12 10v6" />
        <path d="M9 13h6" />
    </BaseIcon>
);

export const IconSparkles: React.FC<IconProps> = (props) => (
    <BaseIcon {...props}>
        <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
        <path d="M5 3v4" />
        <path d="M9 5H3" />
    </BaseIcon>
);

export const IconUser: React.FC<IconProps> = (props) => (
    <BaseIcon {...props}>
        <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
    </BaseIcon>
);

export const IconUsers: React.FC<IconProps> = (props) => (
    <BaseIcon {...props}>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </BaseIcon>
);

export const IconUserGroup: React.FC<IconProps> = (props) => (
    <BaseIcon {...props}>
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </BaseIcon>
);

export const IconLogout: React.FC<IconProps> = (props) => (
    <BaseIcon {...props}>
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <polyline points="16 17 21 12 16 7" />
        <line x1="21" x2="9" y1="12" y2="12" />
    </BaseIcon>
);

export const IconSend: React.FC<IconProps> = (props) => (
    <BaseIcon {...props}>
        <path d="m22 2-7 20-4-9-9-4Z" />
        <path d="M22 2 11 13" />
    </BaseIcon>
);

export const IconPlay: React.FC<IconProps> = (props) => (
    <BaseIcon {...props}>
        <polygon points="5 3 19 12 5 21 5 3" />
    </BaseIcon>
);

export const IconLink: React.FC<IconProps> = (props) => (
    <BaseIcon {...props}>
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </BaseIcon>
);

export const IconPlus: React.FC<IconProps> = (props) => (
    <BaseIcon {...props}>
        <path d="M5 12h14" />
        <path d="M12 5v14" />
    </BaseIcon>
);

export const IconMinus: React.FC<IconProps> = (props) => (
    <BaseIcon {...props}>
        <path d="M5 12h14" />
    </BaseIcon>
);

export const IconSettings: React.FC<IconProps> = (props) => (
    <BaseIcon {...props}>
        <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.09a2 2 0 0 1-1-1.74v-.47a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.35a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
        <circle cx="12" cy="12" r="3" />
    </BaseIcon>
);

export const IconTrash: React.FC<IconProps> = (props) => (
    <BaseIcon {...props}>
        <path d="M3 6h18" />
        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
    </BaseIcon>
);

export const IconPencil: React.FC<IconProps> = (props) => (
    <BaseIcon {...props}>
        <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
        <path d="m15 5 4 4" />
    </BaseIcon>
);

export const IconDeviceFloppy: React.FC<IconProps> = (props) => (
    <BaseIcon {...props}>
        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
        <polyline points="17 21 17 13 7 13 7 21" />
        <polyline points="7 3 7 8 15 8" />
    </BaseIcon>
);

export const IconDownload: React.FC<IconProps> = (props) => (
    <BaseIcon {...props}>
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" x2="12" y1="15" y2="3" />
    </BaseIcon>
);

export const IconUpload: React.FC<IconProps> = (props) => (
    <BaseIcon {...props}>
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="17 8 12 3 7 8" />
        <line x1="12" x2="12" y1="3" y2="15" />
    </BaseIcon>
);

export const IconArrowLeft: React.FC<IconProps> = (props) => (
    <BaseIcon {...props}>
        <path d="m12 19-7-7 7-7" />
        <path d="M19 12H5" />
    </BaseIcon>
);

export const IconX: React.FC<IconProps> = (props) => (
    <BaseIcon {...props}>
        <path d="M18 6 6 18" />
        <path d="m6 6 12 12" />
    </BaseIcon>
);

export const IconPaperclip: React.FC<IconProps> = (props) => (
    <BaseIcon {...props}>
        <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />
    </BaseIcon>
);

export const IconChevronRight: React.FC<IconProps> = (props) => (
    <BaseIcon {...props}>
        <path d="m9 18 6-6-6-6" />
    </BaseIcon>
);

export const IconId: React.FC<IconProps> = (props) => (
    <BaseIcon {...props}>
        <rect width="18" height="14" x="3" y="5" rx="2" />
        <path d="M7 15h4" />
        <path d="M7 11h2" />
        <rect width="4" height="4" x="14" y="9" rx="1" />
    </BaseIcon>
);

export const IconChevronDown: React.FC<IconProps> = (props) => (
    <BaseIcon {...props}>
        <path d="m6 9 6 6 6-6" />
    </BaseIcon>
);

export const IconChevronUp: React.FC<IconProps> = (props) => (
    <BaseIcon {...props}>
        <path d="m18 15-6-6-6 6" />
    </BaseIcon>
);

export const IconCheck: React.FC<IconProps> = (props) => (
    <BaseIcon {...props}>
        <path d="M20 6 9 17l-5-5" />
    </BaseIcon>
);

export const IconPalette: React.FC<IconProps> = (props) => (
    <BaseIcon {...props}>
        <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" />
        <circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
        <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" />
        <circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
        <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
    </BaseIcon>
);

export const IconMoon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props}>
        <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </BaseIcon>
);

export const IconSun: React.FC<IconProps> = (props) => (
    <BaseIcon {...props}>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2" />
        <path d="M12 20v2" />
        <path d="m4.93 4.93 1.41 1.41" />
        <path d="m17.66 17.66 1.41 1.41" />
        <path d="M2 12h2" />
        <path d="M20 12h2" />
        <path d="m6.34 17.66-1.41 1.41" />
        <path d="m19.07 4.93-1.41 1.41" />
    </BaseIcon>
);

export const IconChatBubble: React.FC<IconProps> = (props) => (
    <BaseIcon {...props}>
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </BaseIcon>
);

export const IconAccessibility: React.FC<IconProps> = (props) => (
    <BaseIcon {...props}>
        <circle cx="16" cy="4" r="1" />
        <path d="m18 19 1-7-6 1" />
        <path d="m5 8 3-3 5.5 3-2.36 3.5" />
        <path d="M4.24 14.5a5 5 0 0 0 6.88 6" />
        <path d="M13.76 17.5a5 5 0 0 0-6.88-6" />
    </BaseIcon>
);

export const IconQuestionMarkCircle: React.FC<IconProps> = (props) => (
    <BaseIcon {...props}>
        <circle cx="12" cy="12" r="10" />
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
        <path d="M12 17h.01" />
    </BaseIcon>
);

export const IconCode: React.FC<IconProps> = (props) => (
    <BaseIcon {...props}>
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
    </BaseIcon>
);

export const IconBriefcase: React.FC<IconProps> = (props) => (
    <BaseIcon {...props}>
        <rect width="20" height="14" x="2" y="7" rx="2" ry="2" />
        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </BaseIcon>
);

export const IconAlignLeft: React.FC<IconProps> = (props) => (
    <BaseIcon {...props}>
        <line x1="21" x2="3" y1="6" y2="6" />
        <line x1="15" x2="3" y1="12" y2="12" />
        <line x1="17" x2="3" y1="18" y2="18" />
    </BaseIcon>
);

export const IconAlignCenter: React.FC<IconProps> = (props) => (
    <BaseIcon {...props}>
        <line x1="21" x2="3" y1="6" y2="6" />
        <line x1="17" x2="7" y1="12" y2="12" />
        <line x1="19" x2="5" y1="18" y2="18" />
    </BaseIcon>
);

export const IconAlignRight: React.FC<IconProps> = (props) => (
    <BaseIcon {...props}>
        <line x1="21" x2="3" y1="6" y2="6" />
        <line x1="21" x2="9" y1="12" y2="12" />
        <line x1="21" x2="7" y1="18" y2="18" />
    </BaseIcon>
);

export const IconAlignTop: React.FC<IconProps> = (props) => (
    <BaseIcon {...props}>
        <line x1="21" x2="3" y1="4" y2="4" />
        <path d="M12 20V8" />
        <path d="m8 12 4-4 4 4" />
    </BaseIcon>
);

export const IconAlignMiddle: React.FC<IconProps> = (props) => (
    <BaseIcon {...props}>
        <line x1="21" x2="3" y1="12" y2="12" />
        <path d="m8 8 4 4 4-4" />
        <path d="m8 16 4-4 4 4" />
    </BaseIcon>
);

export const IconAlignBottom: React.FC<IconProps> = (props) => (
    <BaseIcon {...props}>
        <line x1="21" x2="3" y1="20" y2="20" />
        <path d="M12 4v12" />
        <path d="m8 12 4 4 4-4" />
    </BaseIcon>
);

export const IconClock: React.FC<IconProps> = (props) => (
    <BaseIcon {...props}>
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
    </BaseIcon>
);

export const IconTextColor: React.FC<IconProps> = (props) => (
    <BaseIcon {...props}>
        <path d="M4 20h16" />
        <path d="m6 16 6-14 6 14" />
        <path d="M8 12h8" />
    </BaseIcon>
);

export const IconBackgroundColor: React.FC<IconProps> = (props) => (
    <BaseIcon {...props}>
        <path d="M19 11 4.6 25.4a2.1 2.1 0 0 1-2.9-2.9L16.1 8.1l2.9 2.9z" />
        <path d="M21 6 9 18" />
        <path d="M5 21 21 5" />
    </BaseIcon>
);

export const IconRemoveFormat: React.FC<IconProps> = (props) => (
    <BaseIcon {...props}>
        <path d="M4 7V4h16v3" />
        <path d="M9 20h6" />
        <path d="M12 4v16" />
        <line x1="5" x2="19" y1="5" y2="19" />
    </BaseIcon>
);

export const IconRemoveBackgroundColor: React.FC<IconProps> = (props) => (
    <BaseIcon {...props}>
        <path d="M2 2l20 20" />
        <path d="M8.4 4.8l2.9 2.9" />
        <path d="M16.1 8.1l2.9 2.9L4.6 25.4a2.1 2.1 0 0 1-2.9-2.9L5.3 19" />
    </BaseIcon>
);

export const IconThemeColor: React.FC<IconProps> = (props) => (
    <BaseIcon {...props}>
        <circle cx="12" cy="12" r="10" />
        <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
        <path d="M2 12h20" />
    </BaseIcon>
);

export const IconBorder: React.FC<IconProps> = (props) => (
    <BaseIcon {...props}>
        <rect width="18" height="18" x="3" y="3" rx="2" />
        <path d="M3 9h18" />
        <path d="M3 15h18" />
        <path d="M9 3v18" />
        <path d="M15 3v18" />
    </BaseIcon>
);

export const IconSwitchLocation: React.FC<IconProps> = (props) => (
    <BaseIcon {...props}>
        <path d="M8 3 4 7l4 4" />
        <path d="M4 7h16" />
        <path d="m16 21 4-4-4-4" />
        <path d="M20 17H4" />
    </BaseIcon>
);

export const IconLockClosed: React.FC<IconProps> = (props) => (
    <BaseIcon {...props}>
        <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </BaseIcon>
);

export const IconLockOpen: React.FC<IconProps> = (props) => (
    <BaseIcon {...props}>
        <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 9.9-1" />
    </BaseIcon>
);

export const IconLibrary: React.FC<IconProps> = (props) => (
    <BaseIcon {...props}>
        <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
        <path d="M12 6h4" />
        <path d="M12 10h4" />
        <path d="M8 6h.01" />
        <path d="M8 10h.01" />
    </BaseIcon>
);

export const IconFolder: React.FC<IconProps> = (props) => (
    <BaseIcon {...props}>
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </BaseIcon>
);

export const IconStar: React.FC<IconProps> = (props) => (
    <BaseIcon {...props}>
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </BaseIcon>
);

export const IconImage: React.FC<IconProps> = (props) => (
    <BaseIcon {...props}>
        <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <polyline points="21 15 16 10 5 21" />
    </BaseIcon>
);
