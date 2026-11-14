import React from 'react';
import { View, ScrollView, TouchableOpacity, Linking } from 'react-native';
import Header from '@/components/Header';
import ThemedText from '@/components/ThemedText';
import Expandable from '@/components/Expandable';
import Section from '@/components/layout/Section';
import Icon from '@/components/Icon';
import { Button } from '@/components/Button';
import AnimatedView from '@/components/AnimatedView';

// FAQ data
const faqData = [
  {
    id: '1',
    question: 'How do I start with Aftercare?',
    answer: 'Open Aftercare and explore journaling, tarot, and astrology check-ins. Use the mic for voice notes or type freely — your space is ready whenever you are.'
  },
  {
    id: '2',
    question: 'What can Aftercare help me with?',
    answer: 'Aftercare is built for gentle self-reflection: daily journaling, tarot pulls, and astrology insights. Ask questions, capture feelings, and return to what matters to you.'
  },
  {
    id: '3',
    question: 'Does Aftercare remember my previous entries?',
    answer: 'Within a session, Aftercare keeps context so you can continue a thread. Permanent saving and sync will connect to your account once login and storage are set up.'
  },
  {
    id: '4',
    question: 'How should I use the guidance I receive?',
    answer: 'Treat readings and insights as prompts for reflection, not absolute answers. Your intuition and lived experience always come first.'
  },
  {
    id: '5',
    question: 'Can I customize my experience?',
    answer: 'Yes — theme and voice preferences live in Settings. More personalization for rituals and card decks will land as the app grows.'
  },
  {
    id: '6',
    question: 'Is my journaling private?',
    answer: 'Your privacy matters. Entries stay on your device for now; when cloud sync is enabled, they will be tied to your account and under your control.'
  }
];

// Contact information
const contactInfo = [
  {
    id: 'email',
    type: 'Email',
    value: 'support@artometrics.com',
    icon: 'Mail' as const,
    action: () => Linking.openURL('mailto:support@artometrics.com')
  },
  {
    id: 'hours',
    type: 'Support Hours',
    value: 'We typically reply within 1–2 business days',
    icon: 'Clock' as const,
    action: undefined
  }
];

export default function HelpScreen() {
  return (
    <View className="flex-1 bg-background">
      <Header title="Help & Support" showBackButton />
      
      <ScrollView showsVerticalScrollIndicator={false}>
        <AnimatedView animation="fadeIn" duration={400}>
          {/* FAQ Section */}
          <Section 
            title="Frequently Asked Questions" 
            titleSize="xl" 
            className="px-global pt-6 pb-2"
          />
          
          <View className="px-global">
            {faqData.map((faq) => (
              <Expandable 
                key={faq.id}
                title={faq.question}
                className="py-1"
              >
                <ThemedText className="text-text leading-6">
                  {faq.answer}
                </ThemedText>
              </Expandable>
            ))}
          </View>
          

          
          {/* Contact Section */}
          <Section 
            title="Contact Us" 
            titleSize="xl" 
            className="px-global pb-2 mt-14"
            subtitle="We're here to help with any questions or concerns"
          />
          
          <View className="px-global pb-8">
            {contactInfo.map((contact) => (
              <TouchableOpacity 
                key={contact.id}
                onPress={contact.action}
                disabled={!contact.action}
                className="flex-row items-center py-4 border-b border-border"
              >
                <View className="w-10 h-10 rounded-full bg-secondary items-center justify-center mr-4">
                  <Icon name={contact.icon} size={20} />
                </View>
                <View>
                  <ThemedText className="text-sm text-subtext">
                    {contact.type}
                  </ThemedText>
                  <ThemedText className="font-medium">
                    {contact.value}
                  </ThemedText>
                </View>
                {contact.action && (
                  <Icon name="ChevronRight" size={20} className="ml-auto text-subtext" />
                )}
              </TouchableOpacity>
            ))}
            
            <Button 
              title="Email Us" 
              iconStart="Mail"
              className="mt-8"
              onPress={() => Linking.openURL('mailto:support@artometrics.com')}
            />
          </View>
        </AnimatedView>
      </ScrollView>
    </View>
  );
}
