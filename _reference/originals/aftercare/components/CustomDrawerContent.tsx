import { Link, router } from 'expo-router';
import { View, TouchableOpacity, TextInput, Touchable } from 'react-native';
import { shadowPresets } from '@/utils/useShadow';
import ThemedText from './ThemedText';
import Icon, { IconName } from './Icon';
import useThemeColors from '@/app/contexts/ThemeColors';
import ThemeToggle from '@/components/ThemeToggle';
import ThemedScroller from './ThemeScroller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const History = [
    { label: 'Home', href: '/' },
    { label: 'Chat with suggestions', href: '/(drawer)/suggestions' },
    { label: 'Lottie animation', href: '/(drawer)/lottie' },
    { label: 'Microphone centered', href: '/(drawer)/mic-animation' },
];


export default function CustomDrawerContent() {
    const insets = useSafeAreaInsets();
    const colors = useThemeColors();
    return (
        <View className="flex-1 px-global bg-background" style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}>
            <ThemedScroller className='flex-1 px-0 '>
                <View className='flex-row justify-between items-center mt-4'>
                    <View
                        className='bg-secondary rounded-full relative flex-1 mr-4' style={shadowPresets.medium}>
                        <Icon name="Search" className="absolute top-4 left-4 z-50" size={20} />
                        <TextInput
                            className='h-[47px] pl-12 pr-3 rounded-lg bg-transparent text-primary'
                            placeholder='Search'
                            placeholderTextColor={colors.placeholder}
                            returnKeyType="done"
                            autoFocus={false}
                        />
                    </View>
                    <ThemeToggle />
                </View>


                <View className='flex-col pb-4 mb-4 mt-4 border-b border-border'>
                    <NavItem href="/" icon="Plus" label="New chat" />
                    <NavItem href="/screens/search-form" icon="LayoutGrid" label="Explore" />
                </View>

                {History.map((item, index) => (
                    <View key={index} className='py-2'>
                        <Link key={index} href={item.href}>
                            <ThemedText className='text-base font-semibold'>
                                {item.label}
                            </ThemedText>
                        </Link>
                    </View>
                ))}

            </ThemedScroller>
            <TouchableOpacity activeOpacity={0.8} onPress={() => router.push('/screens/profile')} className='bg-background flex-row justify-start items-center pt-4 pb-4 border rounded-3xl px-4 border-border'>
                <View className='w-12 h-12 rounded-full bg-darker items-center justify-center'>
                    <Icon name="Heart" size={22} color={colors.highlight} />
                </View>
                <View className='ml-4'>
                    <ThemedText className='text-base font-semibold'>Aftercare</ThemedText>
                    <ThemedText className='opacity-50 text-xs'>you@aftercare.app</ThemedText>
                </View>
                <Icon name="ChevronRight" size={18} className='ml-auto' />
            </TouchableOpacity>

        </View>
    );
}

type NavItemProps = {
    href: string;
    icon: IconName;
    label: string;
    className?: string;
    description?: string;
};

export const NavItem = ({ href, icon, label, description }: NavItemProps) => (

    <TouchableOpacity onPress={() => router.push(href)} className={`flex-row items-center py-2`}>
        <View className='flex-row items-center justify-center w-9 h-9 bg-secondary rounded-lg'>
            <Icon name={icon} size={18} className='' />
        </View>
        <View className='flex-1 ml-4 '>
            {label &&
                <ThemedText className="text-base font-bold">{label}</ThemedText>
            }
            {description &&
                <ThemedText className='opacity-50 text-xs'>{description}</ThemedText>
            }
        </View>

    </TouchableOpacity>

);
