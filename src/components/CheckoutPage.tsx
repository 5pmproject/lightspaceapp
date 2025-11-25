import React, { useState, useEffect } from 'react';
import svgPaths from "../imports/svg-toln6of0ig";
import { Input } from './ui/input';

interface CheckoutPageProps {
  cartCount: number;
  customerInfo: CustomerInfo;
  onBack: () => void;
  onMenuClick: () => void;
  onProceedToPayment: (customerInfo: CustomerInfo) => void;
}

interface CustomerInfo {
  fullName: string;
  zipCode: string;
  address: string;
  detailedAddress: string;
  city?: string;
  country?: string;
  state?: string;
}

const KOREAN_REGIONS = [
  '서울특별시',
  '부산광역시',
  '대구광역시',
  '인천광역시',
  '광주광역시',
  '대전광역시',
  '울산광역시',
  '세종특별자치시',
  '경기도',
  '강원특별자치도',
  '충청북도',
  '충청남도',
  '전북특별자치도',
  '전라남도',
  '경상북도',
  '경상남도',
  '제주특별자치도'
];

// Korean zip code validation function
function validateZipCode(zipCode: string): boolean {
  if (!zipCode.trim()) return false;
  // Korea: 5 digits
  return /^\d{5}$/.test(zipCode.trim());
}

export default function CheckoutPage({ cartCount, customerInfo, onBack, onMenuClick, onProceedToPayment }: CheckoutPageProps) {
  const [formData, setFormData] = useState<CustomerInfo>(customerInfo);

  const [showRegionDropdown, setShowRegionDropdown] = useState(false);
  const [zipCodeTouched, setZipCodeTouched] = useState(false);

  // Update form data when customerInfo prop changes
  useEffect(() => {
    setFormData(customerInfo);
  }, [customerInfo]);

  // Check if zip code is valid
  const isZipCodeValid = validateZipCode(formData.zipCode);
  const showZipCodeError = zipCodeTouched && formData.zipCode.trim() !== '' && !isZipCodeValid;

  // Check if all required fields are filled and valid
  const isFormValid = formData.fullName.trim() !== '' &&
                     formData.zipCode.trim() !== '' &&
                     formData.address.trim() !== '' &&
                     formData.detailedAddress.trim() !== '' &&
                     isZipCodeValid;

  const updateFormField = (field: keyof CustomerInfo, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleRegionSelect = (region: string) => {
    updateFormField('address', region);
    setShowRegionDropdown(false);
  };

  const handleZipCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 5); // Only allow 5 digits
    updateFormField('zipCode', value);
    setZipCodeTouched(true);
  };

  const handleProceedToPayment = () => {
    if (isFormValid) {
      onProceedToPayment(formData);
    }
  };


  return (
    <div className="bg-[#ffffff] relative size-full">
      {/* Status Bar */}
      <StatusBar />
      
      {/* Header */}
      <Header 
        cartCount={cartCount}
        onBack={onBack}
        onMenuClick={onMenuClick}
      />
      
      {/* Progress Indicators */}
      <ProgressIndicators />
      
      {/* Divider Line */}
      <div className="absolute h-0 left-6 right-6 top-[222px]">
        <div className="absolute bottom-0 left-0 right-0 top-[-1px]">
          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 327 1">
            <line stroke="var(--stroke-0, #E5E5E5)" x2="327" y1="0.5" y2="0.5" />
          </svg>
        </div>
      </div>
      
      {/* Shipping Label */}
      <div className="absolute flex flex-col font-['Newsreader:Regular',_sans-serif] font-normal justify-center leading-[0] left-[72px] text-[#E07B39] text-[24px] text-left top-[190px] tracking-[-0.48px] translate-y-[-50%] w-[138.5px]">
        <p className="adjustLetterSpacing block leading-[32px] text-[24px]">배송 정보</p>
      </div>
      
      {/* Shipping Description */}
      <div className="absolute flex flex-col font-['Inter:Regular',_sans-serif] font-normal justify-center leading-[0] left-6 not-italic text-[#000000] text-[16px] text-left text-nowrap top-[258px] translate-y-[-50%]">
        <p className="block leading-[1.5] whitespace-pre text-[16px]">
          주문 상품을 받으실 주소
        </p>
      </div>
      
      {/* Form Fields */}
      <div className="absolute left-6 right-6 top-[286px]">
        <div className="box-border content-stretch flex flex-col gap-2 items-start justify-start p-0 relative w-full">
          
          {/* Full Name */}
          <FormField label="이름">
            <Input
              value={formData.fullName}
              onChange={(e) => updateFormField('fullName', e.target.value)}
              placeholder="이름을 입력하세요"
              className="bg-[#ffffff] border border-neutral-200 rounded-lg px-4 py-[18px] w-full font-['Inter:Regular',_sans-serif] text-[16px] text-[#000000]"
            />
          </FormField>
          
          {/* Zip Code */}
          <FormField label="우편번호">
            <div className="relative w-full">
              <Input
                value={formData.zipCode}
                onChange={handleZipCodeChange}
                placeholder="12345"
                maxLength={5}
                className={`bg-[#ffffff] border rounded-lg px-4 py-3 w-full font-['Inter:Regular',_sans-serif] text-[16px] text-[#000000] ${
                  showZipCodeError ? 'border-red-500' : 'border-neutral-200'
                }`}
              />
              {showZipCodeError && (
                <div className="mt-1 text-red-500 text-[12px] font-['Inter:Regular',_sans-serif]">
                  5자리 우편번호를 입력하세요
                </div>
              )}
            </div>
          </FormField>
          
          {/* Address (Region Dropdown) */}
          <FormField label="주소">
            <div className="relative w-full">
              <button
                onClick={() => setShowRegionDropdown(!showRegionDropdown)}
                className="bg-[#ffffff] border border-neutral-200 rounded-lg px-4 py-2 w-full font-['Inter:Regular',_sans-serif] text-[16px] text-[#000000] flex items-center justify-between"
              >
                <span className="text-left font-normal text-[12px]">{formData.address || '시/도 선택'}</span>
                <div className="flex h-[4px] items-center justify-center relative shrink-0 w-[7px]">
                  <div className="flex-none rotate-[90deg]">
                    <div className="h-[7px] relative w-[3.5px]">
                      <div className="absolute bottom-[-5.051%] left-[-10.101%] right-[-20.203%] top-[-5.051%]">
                        <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 6 9">
                          <path d="M1 1L4.5 4.5L1 8" stroke="var(--stroke-0, black)" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </button>
              {showRegionDropdown && (
                <div className="absolute top-full left-0 right-0 bg-white border border-neutral-200 rounded-lg mt-1 max-h-48 overflow-y-auto z-50">
                  {KOREAN_REGIONS.map((region) => (
                    <button
                      key={region}
                      onClick={() => handleRegionSelect(region)}
                      className="w-full px-4 py-2 text-left hover:bg-gray-50 font-['Inter:Regular',_sans-serif] text-[16px] text-[#000000]"
                    >
                      {region}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </FormField>
          
          {/* Detailed Address */}
          <FormField label="상세주소">
            <Input
              value={formData.detailedAddress}
              onChange={(e) => updateFormField('detailedAddress', e.target.value)}
              placeholder="상세주소를 입력하세요"
              className="bg-[#ffffff] border border-neutral-200 rounded-lg px-4 py-3 w-full font-['Inter:Regular',_sans-serif] text-[16px] text-[#000000]"
            />
          </FormField>
        </div>
      </div>
      
      {/* Footer */}
      <Footer 
        isFormValid={isFormValid}
        onProceedToPayment={handleProceedToPayment}
      />
    </div>
  );
}

interface FormFieldProps {
  label: string;
  children: React.ReactNode;
}

function FormField({ label, children }: FormFieldProps) {
  return (
    <div className="relative shrink-0 w-full">
      <div className="box-border content-stretch flex flex-col gap-1 items-start justify-start p-0 relative w-full">
        <div className="flex flex-col font-['Inter:Regular',_sans-serif] font-normal justify-center leading-[0] not-italic relative shrink-0 text-[#757575] text-[14px] text-left tracking-[-0.14px] w-full">
          <p className="block leading-[24px]">{label}</p>
        </div>
        {children}
      </div>
    </div>
  );
}

function ProgressIndicators() {
  return (
    <>
      {/* Step 1 - Active */}
      <div className="absolute left-6 top-[174px] size-8">
        <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 32 32">
          <circle cx="16" cy="16" fill="var(--fill-0, #E07B39)" r="16" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-['Roboto:Regular',_sans-serif] font-normal text-[#ffffff] text-[16px] leading-none">1</span>
        </div>
      </div>
      
      {/* Step 2 - Inactive */}
      <div className="absolute size-8 top-[174px]" style={{ left: "calc(50% + 93.5px)" }}>
        <svg fill="none" preserveAspectRatio="none" viewBox="0 0 32 32" className="block size-full">
          <circle cx="16" cy="16" fill="var(--fill-0, #757575)" r="16" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-['Roboto:Regular',_sans-serif] font-normal text-[#ffffff] text-[16px] leading-none">2</span>
        </div>
      </div>
      
      {/* Step 3 - Inactive */}
      <div className="absolute size-8 top-[174px]" style={{ left: "calc(50% + 131.5px)" }}>
        <svg fill="none" preserveAspectRatio="none" viewBox="0 0 32 32" className="block size-full">
          <circle cx="16" cy="16" fill="var(--fill-0, #757575)" r="16" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-['Roboto:Regular',_sans-serif] font-normal text-[#ffffff] text-[16px] leading-none">3</span>
        </div>
      </div>
    </>
  );
}

function StatusBar() {
  return (
    <div className="absolute h-[47px] left-0 overflow-clip right-0 top-0">
      <Notch />
      <LeftSide />
      <RightSide />
    </div>
  );
}

function Notch() {
  return (
    <div
      className="absolute h-[33px] top-[-2px] translate-x-[-50%] w-[156px]"
      style={{ left: "calc(50% + 0.499992px)" }}
    >
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 156 33">
        <g>
          <path d={svgPaths.p28770100} fill="black" />
          <path d={svgPaths.p28f48b80} fill="var(--fill-0, black)" />
          <path d={svgPaths.p14d82600} fill="var(--fill-0, black)" />
        </g>
      </svg>
    </div>
  );
}

function LeftSide() {
  return (
    <div className="absolute contents left-[25px] top-3.5">
      <div
        className="absolute h-[21px] rounded-3xl top-3.5 translate-x-[-50%] w-[54px]"
        style={{ left: "calc(50% - 135.5px)" }}
      >
        <div className="absolute css-a0byvc font-['SF_Pro_Display:Bold',_sans-serif] h-5 leading-[0] left-[27px] not-italic text-[#000000] text-[17px] text-center top-px tracking-[-0.408px] translate-x-[-50%] w-[54px]">
          <p className="adjustLetterSpacing block leading-[22px]">9:41</p>
        </div>
      </div>
    </div>
  );
}

function RightSide() {
  return (
    <div className="absolute contents left-[274px] top-[19px]">
      <div
        className="absolute h-[13px] top-[19px] translate-x-[-50%] w-[27.401px]"
        style={{ left: "calc(50% + 150.201px)" }}
      >
        <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 28 13">
          <g>
            <path d={svgPaths.p3f827980} opacity="0.35" stroke="var(--stroke-0, black)" />
            <path d={svgPaths.p5fdc300} fill="var(--fill-0, black)" opacity="0.4" />
            <path d={svgPaths.pbee4a00} fill="var(--fill-0, black)" />
          </g>
        </svg>
      </div>
      <div className="absolute bottom-[32.269%] left-[80%] right-[15.467%] top-[42.553%]">
        <div className="absolute bottom-[-0.002%] left-0 right-0 top-[0.002%]">
          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 17 12">
            <path d={svgPaths.p17a4bf30} fill="var(--fill-0, black)" />
          </svg>
        </div>
      </div>
      <div
        className="absolute h-3 top-5 translate-x-[-50%] w-[18px]"
        style={{ left: "calc(50% + 95.5px)" }}
      >
        <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 18 12">
          <g>
            <path d={svgPaths.p1ec31400} fill="var(--fill-0, black)" />
            <path d={svgPaths.p19f8d480} fill="var(--fill-0, black)" />
            <path d={svgPaths.p13f4aa00} fill="var(--fill-0, black)" />
            <path d={svgPaths.p1bfb7500} fill="var(--fill-0, black)" />
          </g>
        </svg>
      </div>
    </div>
  );
}

interface HeaderProps {
  cartCount: number;
  onBack: () => void;
  onMenuClick: () => void;
}

function Header({ cartCount, onBack, onMenuClick }: HeaderProps) {
  return (
    <div className="absolute bg-[#ffffff] h-[149px] left-0 right-0 top-0">
      <div className="absolute border-[0px_0px_1px] border-neutral-200 border-solid inset-0 pointer-events-none shadow-[0px_0px_20px_0px_rgba(0,0,0,0.1)]" />
      
      {/* Mobile Nav */}
      <div className="absolute bg-[#ffffff] h-16 left-0 overflow-clip right-0 top-[31px]">
        <div className="absolute bg-[#ffffff] h-[66px] left-0 top-0 w-[393px]" />
        <div
          className="absolute flex flex-col font-['Newsreader:Medium',_sans-serif] font-medium justify-center leading-[0] text-[#E07B39] text-[24px] text-center text-nowrap top-9 tracking-[-0.24px] translate-x-[-50%] translate-y-[-50%]"
          style={{ left: "calc(50% - 0.5px)" }}
        >
          <p className="adjustLetterSpacing block leading-none whitespace-pre text-[24px]">Light Space</p>
        </div>
        
        {/* Cart Icon */}
        <div className="absolute right-5 rounded-2xl size-8 top-[18px]">
          <div className="size-8">
            <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 32 32">
              <g>
                <path d={svgPaths.p2003cd00} fill="var(--fill-0, black)" />
              </g>
            </svg>
          </div>
          {cartCount > 0 && (
            <div className="absolute bg-[#E07B39] left-[17px] rounded-lg size-4 top-[-1px]">
              <div className="flex flex-col items-center justify-center relative size-full">
                <div className="box-border content-stretch flex flex-col gap-2 items-center justify-center px-0.5 py-px relative size-4">
                  <div className="flex flex-col font-['Inter:Medium',_sans-serif] font-medium justify-center leading-[0] not-italic relative shrink-0 text-[#ffffff] text-[12px] text-center text-nowrap tracking-[-0.12px]">
                    <p className="adjustLetterSpacing block leading-none whitespace-pre">{cartCount}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Menu Icon */}
        <button 
          onClick={onMenuClick}
          className="absolute left-5 rounded-2xl size-8 top-[18px] flex items-center justify-center"
        >
          <div className="h-1.5 w-[18px]">
            <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 18 8">
              <g>
                <line stroke="var(--stroke-0, black)" strokeWidth="1.5" x2="18" y1="1.25" y2="1.25" />
                <line stroke="var(--stroke-0, black)" strokeWidth="1.5" x2="18" y1="7.25" y2="7.25" />
              </g>
            </svg>
          </div>
        </button>
      </div>
      
      {/* Sub Nav */}
      <div className="absolute left-6 right-6 top-[103px]">
        <div className="box-border content-stretch flex flex-col gap-4 items-end justify-end p-0 relative w-full">
          <div className="relative shrink-0 w-full">
            <div className="box-border content-stretch flex flex-row font-normal items-center justify-start leading-[0] p-0 relative text-left w-full">
              <div className="basis-0 flex flex-col font-['Newsreader:Regular',_sans-serif] grow justify-center min-h-px min-w-px relative shrink-0 text-[#000000] text-[24px] tracking-[-0.48px]">
                <p className="block leading-[32px] text-[24px]">주문 정보</p>
              </div>
              <button 
                onClick={onBack}
                className="cursor-pointer flex items-center font-['Inter:Regular',_sans-serif] not-italic relative shrink-0 text-[#E07B39] text-[14px] text-nowrap tracking-[-0.14px]"
              >
                <div className="flex flex-row items-center gap-2">
                  <div className="w-3 h-3">
                    <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 12 12">
                      <path d="M7.5 9L4.5 6L7.5 3" stroke="#E07B39" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <p className="adjustLetterSpacing block leading-[24px] whitespace-pre">뒤로</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface FooterProps {
  isFormValid: boolean;
  onProceedToPayment: () => void;
}

function Footer({ isFormValid, onProceedToPayment }: FooterProps) {
  return (
    <div className="absolute bg-[#ffffff] bottom-0 h-[124px] left-0 overflow-clip right-0 shadow-[0px_0px_20px_0px_rgba(0,0,0,0.1)]">
      {/* Proceed to Payment Button */}
      <button
        onClick={isFormValid ? onProceedToPayment : undefined}
        disabled={!isFormValid}
        className={`absolute left-6 right-6 rounded-lg top-6 ${
          isFormValid ? 'bg-[#E07B39] cursor-pointer' : 'bg-neutral-200 cursor-not-allowed'
        }`}
      >
        <div className="flex flex-row items-center relative size-full">
          <div className="box-border content-stretch flex flex-row gap-2 items-center justify-start pl-6 pr-4 py-2 relative w-full">
            <div className="basis-0 flex flex-col font-['Inter:Regular',_sans-serif] font-normal grow justify-center leading-[0] min-h-px min-w-px not-italic relative shrink-0 text-[#ffffff] text-[16px] text-left tracking-[-0.16px]">
              <p className="block leading-[24px]">결제하기</p>
            </div>
            <div className="size-8 relative shrink-0">
              <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 32 32">
                <g>
                  <path d={svgPaths.p3d7c1f80} fill="var(--fill-0, white)" />
                </g>
              </svg>
            </div>
          </div>
        </div>
      </button>
    </div>
  );
}