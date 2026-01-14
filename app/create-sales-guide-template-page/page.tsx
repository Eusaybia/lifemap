'use client'

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';

export default function CreateSalesGuideTemplatePage() {
  const router = useRouter();
  
  useEffect(() => {
    // Generate a random ID for the new quanta
    const newQuantaId = uuidv4();
    
    // Store the ID before redirect
    sessionStorage.setItem('newSalesGuide', newQuantaId);
    
    // Use the same ID for the redirect
    router.push(`/q/${newQuantaId}`);
  }, []);

  return null;
} 