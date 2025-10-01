import React, { useState } from 'react'
import './FAQ.css'

const FAQ: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const faqs = [
    {
      question: "How do I book a service?",
      answer: "You can book our services through our website contact form, by calling us directly, or through our mobile app. We'll schedule a consultation to discuss your specific needs and create a customized care plan."
    },
    {
      question: "Are your caregivers background checked?",
      answer: "Yes, all our caregivers undergo comprehensive background checks, including criminal history, reference verification, and professional certifications. We also require ongoing training and regular evaluations."
    },
    {
      question: "What if I need to cancel or reschedule?",
      answer: "We understand that plans can change. We offer flexible cancellation policies with advance notice. Same-day cancellations may incur a small fee, but we'll work with you to find alternative solutions whenever possible."
    },
    {
      question: "Do you provide services on weekends and holidays?",
      answer: "Yes, we provide services 7 days a week, including weekends and most holidays. Holiday rates may apply, and we recommend booking in advance for holiday periods as availability can be limited."
    },
    {
      question: "What areas do you serve?",
      answer: "We currently serve the greater metropolitan area and surrounding suburbs. Contact us to confirm if we provide services in your specific location. We're always expanding our service areas."
    },
    {
      question: "How do you handle emergencies?",
      answer: "All our caregivers are trained in emergency procedures and first aid. We maintain contact with local veterinarians and pediatricians, and we'll immediately contact you and emergency services if needed. We also have a 24/7 emergency hotline."
    }
  ]

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index)
  }

  return (
    <section id="faq" className="faq">
      <div className="container">
        <div className="section-header">
          <h2>Frequently Asked Questions</h2>
          <p>Find answers to common questions about our services</p>
        </div>
        <div className="faq-container">
          {faqs.map((faq, index) => (
            <div key={index} className="faq-item">
              <div 
                className="faq-question"
                onClick={() => toggleFAQ(index)}
              >
                <h3>{faq.question}</h3>
                <i className={`fas fa-chevron-${openIndex === index ? 'up' : 'down'}`}></i>
              </div>
              {openIndex === index && (
                <div className="faq-answer">
                  <p>{faq.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default FAQ