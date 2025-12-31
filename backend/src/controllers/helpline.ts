// src/config/helplines.ts

export interface Helpline {
  name: string;
  number: string;
  available: string;
  description: string;
}

export interface CrisisHelplines {
  message: string;
  helplines: Helpline[];
  additionalMessage: string;
}

export const crisisHelplines: Record<string, CrisisHelplines> = {
  harm_others: {
    message: 'I\'m very concerned about what you shared. Thoughts about hurting others are serious and need immediate professional help. Please reach out to these resources right away, or call 911 if there is an immediate risk:',
    helplines: [
      {
        name: '🚨 Emergency Services',
        number: '911',
        available: '24/7',
        description: 'For immediate safety concerns - call now'
      },
      {
        name: '🇨🇦 Canada Suicide Prevention Service',
        number: '1-833-456-4566',
        available: '24/7',
        description: 'Crisis counseling and immediate support'
      },
      {
        name: '💙 ConnexOntario Mental Health',
        number: '1-866-531-2600',
        available: '24/7',
        description: 'Mental health crisis services'
      },
      {
        name: '🏥 Local Hospital Emergency',
        number: 'Visit nearest ER',
        available: '24/7',
        description: 'In-person crisis intervention'
      }
    ],
    additionalMessage: 'You matter, and your life has value. Please reach out to one of these resources - they care about you and want to help, eh. 🍁'
  },

  suicidal: {
    message: 'I\'m really concerned about what you shared. Your safety is the most important thing right now. Please reach out to one of these crisis resources immediately - they\'re available 24/7 and want to help you, eh.',
    helplines: [
      {
        name: '🇨🇦 Canada Suicide Prevention Service',
        number: '1-833-456-4566',
        available: '24/7',
        description: 'Call or text for immediate support'
      },
      {
        name: '📱 Crisis Text Line',
        number: 'Text CONNECT to 686868',
        available: '24/7',
        description: 'Text-based crisis support'
      },
      {
        name: '🆘 Kids Help Phone (under 29)',
        number: '1-800-668-6868',
        available: '24/7',
        description: 'Support for youth and young adults'
      },
      {
        name: '🏥 Emergency Services',
        number: '911',
        available: '24/7',
        description: 'For immediate life-threatening emergencies'
      }
    ],
    additionalMessage: 'You matter, and your life has value. Please reach out to one of these resources - they care about you and want to help, eh. 🍁'
  },

  self_harm: {
    message: 'Thank you for sharing this with me. I\'m worried about you, and I want you to know that you deserve support and care. Please reach out to these resources:',
    helplines: [
      {
        name: '🇨🇦 Canada Suicide Prevention Service',
        number: '1-833-456-4566',
        available: '24/7',
        description: 'Crisis support for self-harm'
      },
      {
        name: '📱 Crisis Text Line',
        number: 'Text CONNECT to 686868',
        available: '24/7',
        description: 'Text-based support'
      },
      {
        name: '🆘 Kids Help Phone (under 29)',
        number: '1-800-668-6868',
        available: '24/7',
        description: 'Youth crisis support'
      },
      {
        name: '💙 ConnexOntario Mental Health',
        number: '1-866-531-2600',
        available: '24/7',
        description: 'Mental health services'
      }
    ],
    additionalMessage: 'You matter, and your life has value. Please reach out to one of these resources - they care about you and want to help, eh. 🍁'
  },

  severe_distress: {
    message: 'I can hear that you\'re going through a really tough time. You don\'t have to face this alone. Here are some resources that can provide support:',
    helplines: [
      {
        name: '🇨🇦 Canada Suicide Prevention Service',
        number: '1-833-456-4566',
        available: '24/7',
        description: 'Someone to talk to anytime'
      },
      {
        name: '📱 Crisis Text Line',
        number: 'Text CONNECT to 686868',
        available: '24/7',
        description: 'Text-based support'
      },
      {
        name: '💙 ConnexOntario Mental Health',
        number: '1-866-531-2600',
        available: '24/7',
        description: 'Mental health resources'
      },
      {
        name: '🌍 Distress Centres Ontario',
        number: 'Visit ontario.cmha.ca/find-help',
        available: 'Various',
        description: 'Find local support'
      }
    ],
    additionalMessage: 'You matter, and your life has value. Please reach out to one of these resources - they care about you and want to help, eh. 🍁'
  }
};

export const getHelplinesByType = (crisisType: string): CrisisHelplines | null => {
  return crisisHelplines[crisisType] || null;
};