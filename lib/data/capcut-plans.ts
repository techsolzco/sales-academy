export interface CoursePlan {
  id: string
  courseId: string
  name: string
  devices: string
  duration: string
  aiCredits: string
  price: number
  priceDisplay: string
  billingCycle: 'monthly' | 'weekly'
  isWeekly?: boolean
  isPopular?: boolean
  freeBonuses: string[]
  description: string
  deviceRuleNotice: string
  manualEnrolmentNotice: string
}

export const CAPCUT_COURSE_ID = 'c9f4c3a1-7e82-4f91-b384-5a2d8e41a001'

export const CAPCUT_ENROLMENT_PLANS: CoursePlan[] = [
  {
    id: 'capcut-plan-1',
    courseId: CAPCUT_COURSE_ID,
    name: '1 Device (Mobile only)',
    devices: '1 Device (Mobile only)',
    duration: '1 month',
    aiCredits: 'No AI credits',
    price: 399,
    priceDisplay: 'Rs 399',
    billingCycle: 'monthly',
    isWeekly: false,
    freeBonuses: [
      '500,000 Ready Reels',
      '50 Premium Mobile Apps',
      'Premium PC Softwares',
    ],
    description: 'Perfect for creators who edit exclusively on smartphone (Android or iOS). Standard Pro tools without AI cloud generation.',
    deviceRuleNotice: 'Mobile only: This plan supports 1 smartphone. For PC editing, please choose a 2-Device plan.',
    manualEnrolmentNotice: 'Manual enrolment only: After payment, send screenshot & details to the team for verification. Access is granted manually.',
  },
  {
    id: 'capcut-plan-2',
    courseId: CAPCUT_COURSE_ID,
    name: '2 Devices (Mobile + PC) - No AI Credits',
    devices: '2 Devices (Mobile + PC)',
    duration: '1 month',
    aiCredits: 'No AI credits',
    price: 499,
    priceDisplay: 'Rs 499',
    billingCycle: 'monthly',
    isWeekly: false,
    freeBonuses: [
      '500,000 Ready Reels',
      '50 Premium Mobile Apps',
      'Premium PC Softwares',
    ],
    description: 'Allows editing on both your Mobile phone and Desktop PC. All Pro editing effects, transitions, and timeline tools included.',
    deviceRuleNotice: '2 Devices means Mobile + PC. PC editing requires this 2-device plan.',
    manualEnrolmentNotice: 'Manual enrolment only: After payment, send screenshot & details to the team for verification. Access is granted manually.',
  },
  {
    id: 'capcut-plan-3',
    courseId: CAPCUT_COURSE_ID,
    name: '2 Devices (Mobile + PC) - 500 AI Credits',
    devices: '2 Devices (Mobile + PC)',
    duration: '1 month',
    aiCredits: '500 monthly AI credits',
    price: 599,
    priceDisplay: 'Rs 599',
    billingCycle: 'monthly',
    isWeekly: false,
    freeBonuses: [
      '500,000 Ready Reels',
      '50 Premium Mobile Apps',
      'Premium PC Softwares',
    ],
    description: 'Mobile + PC editing with 500 monthly AI credits for AI script-to-video, auto-captions styling, and background cut-out.',
    deviceRuleNotice: '2 Devices means Mobile + PC. PC editing requires this 2-device plan.',
    manualEnrolmentNotice: 'Manual enrolment only: After payment, send screenshot & details to the team for verification. Access is granted manually.',
  },
  {
    id: 'capcut-plan-4',
    courseId: CAPCUT_COURSE_ID,
    name: '2 Devices (Mobile + PC) - 1200 AI Credits',
    devices: '2 Devices (Mobile + PC)',
    duration: '1 month',
    aiCredits: '1200 monthly AI credits',
    price: 699,
    priceDisplay: 'Rs 699',
    billingCycle: 'monthly',
    isPopular: true,
    isWeekly: false,
    freeBonuses: [
      '500,000 Ready Reels',
      '50 Premium Mobile Apps',
      'Premium PC Softwares',
    ],
    description: 'Most popular creator package. Mobile + PC access with 1200 monthly AI credits for regular daily short-form content creation.',
    deviceRuleNotice: '2 Devices means Mobile + PC. PC editing requires this 2-device plan.',
    manualEnrolmentNotice: 'Manual enrolment only: After payment, send screenshot & details to the team for verification. Access is granted manually.',
  },
  {
    id: 'capcut-plan-5',
    courseId: CAPCUT_COURSE_ID,
    name: '2 Devices (Mobile + PC) - 1600 AI Credits',
    devices: '2 Devices (Mobile + PC)',
    duration: '1 month',
    aiCredits: '1600 monthly AI credits',
    price: 799,
    priceDisplay: 'Rs 799',
    billingCycle: 'monthly',
    isWeekly: false,
    freeBonuses: [
      '500,000 Ready Reels',
      '50 Premium Mobile Apps',
      'Premium PC Softwares',
    ],
    description: 'Power creator package. Mobile + PC access with 1600 monthly AI credits for high-volume video production and agency work.',
    deviceRuleNotice: '2 Devices means Mobile + PC. PC editing requires this 2-device plan.',
    manualEnrolmentNotice: 'Manual enrolment only: After payment, send screenshot & details to the team for verification. Access is granted manually.',
  },
  {
    id: 'capcut-plan-6',
    courseId: CAPCUT_COURSE_ID,
    name: '2 Devices (Mobile + PC) - 2000 AI Credits',
    devices: '2 Devices (Mobile + PC)',
    duration: '1 month',
    aiCredits: '2000 monthly AI credits',
    price: 899,
    priceDisplay: 'Rs 899',
    billingCycle: 'monthly',
    isWeekly: false,
    freeBonuses: [
      '500,000 Ready Reels',
      '50 Premium Mobile Apps',
      'Premium PC Softwares',
    ],
    description: 'Ultimate production tier. Mobile + PC access with 2000 monthly AI credits for agencies, heavy creators, and studio workflows.',
    deviceRuleNotice: '2 Devices means Mobile + PC. PC editing requires this 2-device plan.',
    manualEnrolmentNotice: 'Manual enrolment only: After payment, send screenshot & details to the team for verification. Access is granted manually.',
  },
  {
    id: 'capcut-plan-7',
    courseId: CAPCUT_COURSE_ID,
    name: '2 Devices (Mobile + PC) - 7 Days (Weekly)',
    devices: '2 Devices (Mobile + PC)',
    duration: '7 days',
    aiCredits: '500 AI credits',
    price: 249,
    priceDisplay: 'Rs 249 (Weekly)',
    billingCycle: 'weekly',
    isWeekly: true,
    freeBonuses: [
      '500,000 Ready Reels',
      '50 Premium Mobile Apps',
      'Premium PC Softwares',
    ],
    description: 'Weekly access plan. 7 days access on Mobile + PC with 500 AI credits. Great for short-term projects or testing.',
    deviceRuleNotice: '2 Devices means Mobile + PC. PC editing requires this 2-device plan.',
    manualEnrolmentNotice: 'Manual enrolment only: After payment, send screenshot & details to the team for verification. Access is granted manually.',
  },
]

export function getPlansForCourse(courseId: string): CoursePlan[] {
  if (courseId === CAPCUT_COURSE_ID) {
    return CAPCUT_ENROLMENT_PLANS
  }
  return []
}
