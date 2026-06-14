import React, { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import SectionLabel from './ui/SectionLabel'
import './FAQ.css'

const FAQ: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const faqs = [
    {
      question: 'How do I book a service?',
      answer:
        "You can book through our website by browsing sitters, or use Smart Match to get matched automatically. We'll help you arrange a consultation to discuss your needs and agree a care plan.",
    },
    {
      question: 'Are your caregivers background checked?',
      answer:
        'Yes. Every caregiver completes ID verification (KYC), reference checks and document review before they can be booked, plus ongoing evaluations.',
    },
    {
      question: 'What if I need to cancel or reschedule?',
      answer:
        "Plans change — we offer flexible cancellation with advance notice. Same-day cancellations may incur a small fee, but we'll always try to find an alternative.",
    },
    {
      question: 'Do you provide services on weekends and holidays?',
      answer:
        'Yes, 7 days a week including most holidays. Holiday rates may apply, and we recommend booking ahead as availability can be limited.',
    },
    {
      question: 'What areas do you serve?',
      answer:
        "We currently serve Beirut and surrounding areas across Lebanon, and we're always expanding. Get in touch to confirm coverage for your location.",
    },
    {
      question: 'How do you handle emergencies?',
      answer:
        "All caregivers are trained in first aid and emergency procedures. We'll contact you and emergency services immediately if needed, and keep local vets and pediatricians on hand.",
    },
  ]

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index)
  }

  return (
    <section id="faq" className="faq">
      <div className="container">
        <div className="section-header">
          <SectionLabel center>Good to know</SectionLabel>
          <h2>Questions, answered</h2>
        </div>
        <div className="faq-container">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index
            return (
              <div
                key={index}
                className={`faq-item ${isOpen ? 'active' : ''}`}
              >
                <button
                  type="button"
                  className="faq-question"
                  onClick={() => toggleFAQ(index)}
                  aria-expanded={isOpen}
                >
                  <h3>{faq.question}</h3>
                  <ChevronDown size={20} className="faq-chevron" />
                </button>
                {isOpen && (
                  <div className="faq-answer">
                    <p>{faq.answer}</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

export default FAQ
